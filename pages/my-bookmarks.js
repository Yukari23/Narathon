'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/MyBookmarks.module.css';
import { FaBookmark, FaStethoscope, FaUtensils, FaTimes, FaSearch } from 'react-icons/fa';

function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}

export default function MyBookmarks() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [diseaseCategories, setDiseaseCategories] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  // ตรวจสอบสถานะการล็อกอิน
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('memberEmail') || localStorage.getItem('userEmail');
      setIsLoggedIn(!!(token && email));
      setUserEmail(email);
    }
  }, []);

  // โหลดข้อมูลบุ๊กมาร์ก
  useEffect(() => {
    if (!isLoggedIn || !userEmail) return;

    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookmarks?email=${encodeURIComponent(userEmail)}`);
        if (!res.ok) throw new Error('Failed to fetch bookmarks');
        const data = await res.json();
        setBookmarks(data.items || []);
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
        setBookmarks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [isLoggedIn, userEmail]);

  // โหลดข้อมูลโรค
  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const res = await fetch('/api/diseases');
        if (res.ok) {
          const data = await res.json();
          setDiseaseCategories(data.diseases || []);
        }
      } catch (error) {
        console.error('Error fetching diseases:', error);
      }
    };

    fetchDiseases();
  }, []);

  // กรองบุ๊กมาร์ก
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = !searchQuery || 
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.diseaseTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDisease = !selectedDisease || 
      bookmark.diseaseTags.includes(selectedDisease.name);
    
    return matchesSearch && matchesDisease;
  });

  // ลบบุ๊กมาร์ก
  const handleRemoveBookmark = async (recipeId) => {
    if (!window.confirm('คุณต้องการลบสูตรนี้ออกจากบุ๊กมาร์กหรือไม่?')) return;
    
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, recipeId })
      });
      
      if (!res.ok) throw new Error('Failed to remove bookmark');
      
      setBookmarks(prev => prev.filter(b => b.recipeId !== recipeId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
      alert('ไม่สามารถลบบุ๊กมาร์กได้');
    }
  };

  // ถ้าไม่ได้ล็อกอิน ให้ redirect ไปหน้า login
  if (!isLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loginPrompt}>
          <h2>กรุณาล็อกอินเพื่อดูบุ๊กมาร์ก</h2>
          <Link href="/Login" className={styles.loginBtn}>
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.backLink}>
            <span className={styles.backIcon}>←</span>
            <span>กลับหน้าหลัก</span>
          </Link>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              <FaBookmark /> สูตรอาหารที่บุ๊กมาร์กไว้
            </h1>
            <p className={styles.subtitle}>
              {bookmarks.length} สูตรที่คุณบุ๊กมาร์กไว้
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <div className={styles.searchIcon}>
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="ค้นหาสูตรอาหาร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.diseaseFilter}>
          <select
            value={selectedDisease?.id || ''}
            onChange={(e) => {
              const disease = diseaseCategories.find(d => d.id === Number(e.target.value));
              setSelectedDisease(disease || null);
            }}
            className={styles.diseaseSelect}
          >
            <option value="">ทุกโรค</option>
            {diseaseCategories.map(disease => (
              <option key={disease.id} value={disease.id}>
                {disease.name}
              </option>
            ))}
          </select>
        </div>

        {(searchQuery || selectedDisease) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDisease(null);
            }}
            className={styles.clearBtn}
          >
            <FaTimes /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Bookmarked Recipes */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>กำลังโหลด...</div>
        ) : filteredBookmarks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <h3>ไม่มีสูตรที่บันทึกไว้</h3>
            <p>เริ่มต้นด้วยการค้นหาและบันทึกสูตรอาหารที่คุณสนใจ</p>
            <Link href="/" className={styles.exploreBtn}>
              ดูสูตรอาหาร
            </Link>
          </div>
        ) : (
          <div className={`${styles.recipeGrid} ${filteredBookmarks.length === 1 ? styles.singleRecipe : ''}`}>
            {filteredBookmarks.map((bookmark) => (
              <div key={bookmark.id} className={styles.recipeCard}>
                <button
                  onClick={() => handleRemoveBookmark(bookmark.recipeId)}
                  className={styles.removeBtn}
                  title="ลบออกจากบุ๊กมาร์ก"
                  aria-label="ลบออกจากบุ๊กมาร์ก"
                >
                  <FaTimes />
                </button>

                <Link href={`/recipes/${bookmark.recipeId}`} className={styles.cardLink}>
                  <div className={styles.cardImage}>
                    <img 
                      src={normalizeImagePath(bookmark.image)} 
                      alt={bookmark.title}
                      onError={(e) => {
                        e.target.src = '/images/GF3.jpg';
                      }}
                    />
                    <div className={styles.cardOverlay}>
                      <div className={styles.viewBtn}>
                        <FaUtensils /> ดูสูตร
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{bookmark.title}</h3>
                    
                    {bookmark.description && (
                      <p className={styles.cardDescription}>
                        {bookmark.description.length > 100 
                          ? `${bookmark.description.substring(0, 100)}...` 
                          : bookmark.description}
                      </p>
                    )}
                    
                    <div className={styles.cardTags}>
                      {/* Disease Tags */}
                      {bookmark.diseaseTags.length > 0 && (
                        <div className={styles.diseaseTagsSection}>
                          <span className={styles.sectionLabel}>โรค:</span>
                          {bookmark.diseaseTags.slice(0, 3).map((tag, index) => {
                            const diseasePalette = ['#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD', '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'];
                            const getDiseaseColor = (id) => diseasePalette[(Number(id) || 0) % diseasePalette.length];
                            return (
                              <span
                                key={index}
                                className={styles.diseaseTag}
                                style={{
                                  backgroundColor: getDiseaseColor(index),
                                  color: '#000000',
                                  borderColor: getDiseaseColor(index),
                                  padding: '4px 8px',
                                  borderRadius: '16px',
                                  fontSize: '0.7rem'
                                }}
                              >
                                {tag}
                              </span>
                            );
                          })}
                          {bookmark.diseaseTags.length > 3 && (
                            <span className={styles.moreTags}>
                              +{bookmark.diseaseTags.length - 3} อื่นๆ
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Meal Tags */}
                      {bookmark.mealName && (
                        <div className={styles.mealTagsSection}>
                          <span className={styles.sectionLabel}>มื้อ:</span>
                          {bookmark.mealName.split(',').map((mealName) => {
                            const mealNameTrimmed = mealName.trim();
                            
                            // ใช้ mealTypes เหมือนหน้าหลัก
                            const mealTypes = [
                              { id: 'breakfast', name: 'มื้อเช้า', color: '#FEF08A' },
                              { id: 'lunch', name: 'มื้อกลางวัน', color: '#BBF7D0' },
                              { id: 'dinner', name: 'มื้อเย็น', color: '#DDD6FE' }
                            ];
                            
                            // หา meal type ที่ตรงกัน
                            const m = mealTypes.find(x => 
                              x.id === mealNameTrimmed || 
                              x.name === mealNameTrimmed ||
                              (mealNameTrimmed === 'breakfast' && x.id === 'breakfast') ||
                              (mealNameTrimmed === 'lunch' && x.id === 'lunch') ||
                              (mealNameTrimmed === 'dinner' && x.id === 'dinner')
                            );

                            return (
                              <span
                                key={`meal-${mealNameTrimmed}`}
                                className={styles.mealTag}
                                style={{
                                  background: m?.color || '#48bb78',
                                  color: '#000000',
                                  borderColor: m?.color || '#48bb78',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '8px',
                                  fontSize: '0.7rem'
                                }}
                                title={m?.name}
                              >
                                {m?.name || mealNameTrimmed}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
