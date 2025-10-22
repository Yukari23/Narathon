'use client'
import { useState, useMemo, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';
import { FaSearch, FaStethoscope, FaUtensils, FaTimes, FaBookmark, FaUserCog } from 'react-icons/fa';
import { FaCircleUser } from 'react-icons/fa6';
import Link from 'next/link';

function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}

export default function Home({ initialRecipes = [], diseaseCategories: diseaseCategoriesProp = [] }) {
  // ===== Auth State =====
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [userImage, setUserImage] = useState('/images/GF3.jpg');
  const [loggedEmail, setLoggedEmail] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const email =
      localStorage.getItem('userEmail') ||
      localStorage.getItem('memberEmail') ||
      null;
    const img =
      localStorage.getItem('userImage') ||
      localStorage.getItem('memberImage') ||
      '/images/GF3.jpg';

    setIsLoggedIn(!!token);
    setRole(userRole || null);
    setUserImage(img);
    setLoggedEmail(email);

    if (email) localStorage.setItem('memberEmail', email);
    else localStorage.removeItem('memberEmail');

    (async () => {
      if (!token) return;

      try {
        // ✅ แอดมิน: ดึงข้อมูลจาก /api/admin เพื่ออัปเดตรูปและอีเมล
        if (userRole === 'admin') {
          const r = await fetch('/api/admin');
          const d = await r.json();
          if (r.ok && d?.admin) {
            const adminImg = d.admin.image || '/images/GF3.jpg';
            setUserImage(adminImg);
            setLoggedEmail(d.admin.email || email);

            localStorage.setItem('userImage', adminImg);
            localStorage.setItem('memberImage', adminImg);
            if (d.admin.email) localStorage.setItem('userEmail', d.admin.email);
          }
          return;
        }

        // ✅ ผู้ใช้ทั่วไป: ดึงจาก /api/members
        if (email) {
          const res = await fetch(`/api/members?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          if (!res.ok) return;
          const dbImg = normalizeImagePath(data?.member?.image);
          if (dbImg) {
            setUserImage(dbImg);
            localStorage.setItem('userImage', dbImg);
            localStorage.setItem('memberImage', dbImg);
          }
        }
      } catch {}
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('memberEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userImage');
    localStorage.removeItem('memberImage');
    window.location.href = '/Login';
  };

  // ===== Data & Filters =====
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [showDiseasePopup, setShowDiseasePopup] = useState(false);
  const [showMealPopup, setShowMealPopup] = useState(false);

  // ===== Auto Recommendation System =====
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState('สูตรอาหารแนะนำ');
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(120); // 2 minutes in seconds


  // ===== Pagination =====
  const [currentPage, setCurrentPage] = useState(1);
  const recipesPerPage = 15; // 3 แนว x 5 บัตร = 15 สูตร

  const [recipes] = useState(
    (initialRecipes || [])
      .filter(r => Number.isFinite(Number(r.id)))
      .map(r => ({ ...r, id: Number(r.id), image: normalizeImagePath(r.image) }))
  );
  const [diseaseCategories] = useState(
    (diseaseCategoriesProp || []).map(d => ({ ...d, id: Number(d.id) }))
  );

  // ✅ ใส่สีให้มื้ออาหาร
  const mealTypes = [
    { id: 'breakfast', name: 'มื้อเช้า',   color: '#FEF08A' }, // เหลือง
    { id: 'lunch',     name: 'มื้อกลางวัน', color: '#BBF7D0' }, // เขียวอ่อน
    { id: 'dinner',    name: 'มื้อเย็น',   color: '#DDD6FE' }, // ม่วงอ่อน
  ];
// แปลงสตริงให้เทียบง่าย (ตัดช่องว่างซ้ำ / lower)
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// หาชื่อโรคจาก id
const getDiseaseById = (id) => diseaseCategories.find(x => x.id === Number(id));

// หาชื่อมื้อจาก key ('breakfast' | 'lunch' | 'dinner')
const getMealName = (key) => {
  const m = mealTypes.find(x => x.id === key);
  return m?.name ?? '';
};

// ฟังก์ชันสำหรับรวมแท็กโรคและลบการซ้ำกัน
const getUniqueDiseaseTags = (recipe, diseaseCategories) => {
  const uniqueTags = new Set();
  
  // เพิ่มแท็กจาก diseases (Disease_code)
  if (recipe.diseases && Array.isArray(recipe.diseases)) {
    recipe.diseases.forEach(diseaseId => {
      const disease = diseaseCategories.find(x => x.id === diseaseId);
      if (disease && disease.name) {
        uniqueTags.add(disease.name);
      }
    });
  }
  
  // เพิ่มแท็กจาก tags (Disease_tags) และลบการซ้ำกัน
  if (recipe.tags && Array.isArray(recipe.tags)) {
    recipe.tags.forEach(tag => {
      if (tag && tag.trim()) {
        const trimmedTag = tag.trim();
        // ตรวจสอบว่าไม่ซ้ำกับชื่อโรคที่มีอยู่แล้ว
        const isDuplicate = Array.from(uniqueTags).some(existingTag => {
          const existingLower = existingTag.toLowerCase();
          const trimmedLower = trimmedTag.toLowerCase();
          
          // ตรวจสอบการซ้ำกันแบบต่างๆ
          return existingLower === trimmedLower ||
                 existingLower.includes(trimmedLower) ||
                 trimmedLower.includes(existingLower) ||
                 // ตรวจสอบการซ้ำกันแบบ "โรคเบาหวาน" vs "เบาหวาน"
                 (existingLower.includes('โรค') && trimmedLower === existingLower.replace('โรค', '')) ||
                 (trimmedLower.includes('โรค') && existingLower === trimmedLower.replace('โรค', '')) ||
                 // ตรวจสอบการซ้ำกันแบบ "เบาหวาน" vs "โรคเบาหวาน"
                 (existingLower === 'เบาหวาน' && trimmedLower === 'โรคเบาหวาน') ||
                 (trimmedLower === 'เบาหวาน' && existingLower === 'โรคเบาหวาน') ||
                 // ตรวจสอบการซ้ำกันแบบ "โรคหัวใจ" vs "หัวใจ"
                 (existingLower === 'หัวใจ' && trimmedLower === 'โรคหัวใจ') ||
                 (trimmedLower === 'หัวใจ' && existingLower === 'โรคหัวใจ') ||
                 // ตรวจสอบการซ้ำกันแบบ "โรคไต" vs "ไต"
                 (existingLower === 'ไต' && trimmedLower === 'โรคไต') ||
                 (trimmedLower === 'ไต' && existingLower === 'โรคไต') ||
                 // ตรวจสอบการซ้ำกันแบบ "โรคความดัน" vs "ความดัน"
                 (existingLower === 'ความดัน' && trimmedLower === 'โรคความดัน') ||
                 (trimmedLower === 'ความดัน' && existingLower === 'โรคความดัน') ||
                 // ตรวจสอบการซ้ำกันแบบ "โรคไขมัน" vs "ไขมัน"
                 (existingLower === 'ไขมัน' && trimmedLower === 'โรคไขมัน') ||
                 (trimmedLower === 'ไขมัน' && existingLower === 'โรคไขมัน') ||
                 // ตรวจสอบการซ้ำกันแบบ "โรคท้องผูก" vs "ท้องผูก"
                 (existingLower === 'ท้องผูก' && trimmedLower === 'โรคท้องผูก') ||
                 (trimmedLower === 'ท้องผูก' && existingLower === 'โรคท้องผูก');
        });
        
        if (!isDuplicate) {
          uniqueTags.add(trimmedTag);
        }
      }
    });
  }
  
  return Array.from(uniqueTags);
};

  const filteredRecipes = useMemo(() => {
  const q = norm(searchQuery);

  return recipes.filter((r) => {
    // ----- กรองตามโรคที่เลือก (รองรับหลายโรค) -----
    const byDisease = selectedDiseases.length === 0 || 
      selectedDiseases.some(disease => (r.diseases || []).includes(Number(disease.id)));

    // ----- กรองตามมื้อที่เลือก (รองรับหลายมื้อ) -----
    const byMeal = selectedMeals.length === 0 || 
      selectedMeals.some(meal => {
        // เปรียบเทียบกับชื่อภาษาไทย (มื้อเช้า, มื้อกลางวัน, มื้อเย็น)
        return (r.mealTypes || []).includes(meal.name);
      });

    // ----- ค้นจากช่องค้นหา: ชื่อเมนู / รายละเอียด / ชื่อโรค / ชื่อมื้อ -----
    if (!q) return byDisease && byMeal;

    const titleStr   = norm(r.title);
    const detailStr  = norm(r.details);

    // รวมชื่อโรคของสูตรนี้ (เช่น "เบาหวาน", "ไต", …)
    const diseaseNameList = (r.diseases || [])
      .map(id => norm(getDiseaseById(id)?.name))
      .filter(Boolean);

    // รวมชื่อมื้อของสูตรนี้ (เช่น "มื้อเช้า", "มื้อเย็น")
    const mealNameList = (r.mealTypes || [])
      .map(key => norm(getMealName(key)))
      .filter(Boolean);

    const byQuery =
      titleStr.includes(q) ||
      detailStr.includes(q) ||
      diseaseNameList.some(name => name.includes(q)) ||
      mealNameList.some(name => name.includes(q));

    return byDisease && byMeal && byQuery;
  });
}, [recipes, selectedDiseases, selectedMeals, searchQuery, diseaseCategories, mealTypes]);

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredRecipes.length / recipesPerPage);
  const startIndex = (currentPage - 1) * recipesPerPage;
  const endIndex = startIndex + recipesPerPage;
  const currentRecipes = filteredRecipes.slice(startIndex, endIndex);

  // ✅ Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDiseases, selectedMeals]);

  // ===== Auto Recommendation Functions =====
  const fetchRecommendedRecipes = async () => {
    setRecommendationLoading(true);
    try {
      // ใช้ระบบแนะนำใหม่ที่อิงจากโรคที่ผู้ใช้สนใจ
      const userEmail = localStorage.getItem('memberEmail') || localStorage.getItem('userEmail');
      if (userEmail) {
        // ถ้ามีผู้ใช้ล็อกอิน ให้แนะนำตามโรคที่สนใจ
        const response = await fetch(`/api/recommendations?email=${encodeURIComponent(userEmail)}&limit=5`);
        const data = await response.json();
        
        if (response.ok && data.recommendations) {
          // แปลงข้อมูลที่ได้จาก API ให้ถูกต้อง
          const formattedRecipes = data.recommendations.map(recipe => {
            
            // แปลง Disease_tags จาก string เป็น array
            const diseaseTags = recipe?.tags ? 
              (Array.isArray(recipe.tags) ? recipe.tags : String(recipe.tags).split(',').map(tag => tag.trim()).filter(Boolean)) : 
              (recipe?.Disease_tags ? String(recipe.Disease_tags).split(',').map(tag => tag.trim()).filter(Boolean) : []);
            
            // แปลง Meal จาก string เป็น array
            let mealTypesArray = [];
            if (recipe?.mealTypes && Array.isArray(recipe.mealTypes)) {
              mealTypesArray = recipe.mealTypes;
            } else if (recipe?.Meal) {
              const mealString = String(recipe.Meal);
              if (mealString.startsWith('[') && mealString.endsWith(']')) {
                try {
                  const parsedMeals = JSON.parse(mealString);
                  if (Array.isArray(parsedMeals)) {
                    mealTypesArray = parsedMeals.map(meal => {
                      if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(String(meal).toLowerCase())) {
                        const translateMeal = (meal) => {
                          switch ((meal || '').toLowerCase()) {
                            case 'breakfast': return 'มื้อเช้า';
                            case 'lunch': return 'มื้อกลางวัน';
                            case 'dinner': return 'มื้อเย็น';
                            case 'snack': return 'ของว่าง';
                            case 'dessert': return 'ของหวาน';
                            default: return meal || 'ไม่ระบุ';
                          }
                        };
                        return translateMeal(meal);
                      }
                      return meal;
                    }).filter(Boolean);
                  }
                } catch (e) {
                  mealTypesArray = [];
                }
              } else {
                const meals = mealString.split(',').map(m => m.trim()).filter(Boolean);
                mealTypesArray = meals.map(meal => {
                  if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(meal.toLowerCase())) {
                    const translateMeal = (meal) => {
                      switch ((meal || '').toLowerCase()) {
                        case 'breakfast': return 'มื้อเช้า';
                        case 'lunch': return 'มื้อกลางวัน';
                        case 'dinner': return 'มื้อเย็น';
                        case 'snack': return 'ของว่าง';
                        case 'dessert': return 'ของหวาน';
                        default: return meal || 'ไม่ระบุ';
                      }
                    };
                    return translateMeal(meal);
                  }
                  return meal;
                }).filter(Boolean);
              }
            }

            // สร้างข้อมูลโรคที่ถูกต้อง
            const diseases = recipe.diseases && Array.isArray(recipe.diseases) ? recipe.diseases : 
                           (recipe.Disease_code ? [Number(recipe.Disease_code)] : []);
            const tags = diseaseTags;

            const formattedRecipe = {
              id: Number(recipe.id || recipe.Recipe_code),
              title: recipe.title || recipe.Recipe_name || 'ไม่ทราบชื่อ',
              image: normalizeImagePath(recipe.image || recipe.Image),
              details: recipe.details || '',
              mealTypes: mealTypesArray,
              diseases: diseases,
              tags: tags,
            };
            
            return formattedRecipe;
          }).filter(x => Number.isFinite(x.id));

          setRecommendedRecipes(formattedRecipes);
          // อัปเดตข้อความแนะนำ
          if (data.recommendationType === 'personalized') {
            setRecommendationMessage(data.message);
          } else {
            setRecommendationMessage('แนะนำสูตรอาหารแบบสุ่ม (ยังไม่ได้เลือกโรคที่สนใจ)');
          }
        } else {
          // ถ้า API ไม่สำเร็จ ให้ใช้วิธีเดิม
          await fetchRandomRecommendations();
        }
      } else {
        // ถ้าไม่มีผู้ใช้ล็อกอิน ให้แนะนำแบบสุ่ม
        await fetchRandomRecommendations();
      }
    } catch (error) {
      console.error('Error fetching recommended recipes:', error);
      // ถ้าเกิดข้อผิดพลาด ให้ใช้วิธีเดิม
      await fetchRandomRecommendations();
    } finally {
      setRecommendationLoading(false);
    }
  };

  // ฟังก์ชันสำหรับแนะนำแบบสุ่ม (fallback)
  const fetchRandomRecommendations = async () => {
    try {
      const response = await fetch('/api/recipes');
      const data = await response.json();
      
      if (response.ok && data.recipes) {
        // สุ่มเลือก 5 สูตรจากทั้งหมด
        const shuffled = [...data.recipes].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        
        // แปลงข้อมูลให้ตรงกับรูปแบบที่ใช้ในหน้า
        const formattedRecipes = selected.map(recipe => {
          // แปลง Disease_tags จาก string เป็น array
          const diseaseTags = recipe?.Disease_tags ? 
            String(recipe.Disease_tags).split(',').map(tag => tag.trim()).filter(Boolean) : [];
          
          // แปลง Meal จาก string เป็น array
          let mealTypesArray = [];
          if (recipe?.Meal) {
            const mealString = String(recipe.Meal);
            if (mealString.startsWith('[') && mealString.endsWith(']')) {
              try {
                const parsedMeals = JSON.parse(mealString);
                if (Array.isArray(parsedMeals)) {
                  mealTypesArray = parsedMeals.map(meal => {
                    if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(String(meal).toLowerCase())) {
                      const translateMeal = (meal) => {
                        switch ((meal || '').toLowerCase()) {
                          case 'breakfast': return 'มื้อเช้า';
                          case 'lunch': return 'มื้อกลางวัน';
                          case 'dinner': return 'มื้อเย็น';
                          case 'snack': return 'ของว่าง';
                          case 'dessert': return 'ของหวาน';
                          default: return meal || 'ไม่ระบุ';
                        }
                      };
                      return translateMeal(meal);
                    }
                    return meal;
                  }).filter(Boolean);
                }
              } catch (e) {
                mealTypesArray = [];
              }
            } else {
              const meals = mealString.split(',').map(m => m.trim()).filter(Boolean);
              mealTypesArray = meals.map(meal => {
                if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(meal.toLowerCase())) {
                  const translateMeal = (meal) => {
                    switch ((meal || '').toLowerCase()) {
                      case 'breakfast': return 'มื้อเช้า';
                      case 'lunch': return 'มื้อกลางวัน';
                      case 'dinner': return 'มื้อเย็น';
                      case 'snack': return 'ของว่าง';
                      case 'dessert': return 'ของหวาน';
                      default: return meal || 'ไม่ระบุ';
                    }
                  };
                  return translateMeal(meal);
                }
                return meal;
              }).filter(Boolean);
            }
          }

          // สร้างข้อมูลโรคที่ถูกต้อง
          const diseases = recipe.Disease_code ? [Number(recipe.Disease_code)] : [];
          const tags = diseaseTags;

          return {
            id: Number(recipe.Recipe_code),
            title: recipe.Recipe_name || 'ไม่ทราบชื่อ',
            image: normalizeImagePath(recipe.Image),
            details: recipe.details || '',
            mealTypes: mealTypesArray,
            diseases: diseases,
            tags: tags,
          };
        }).filter(x => Number.isFinite(x.id));

        setRecommendedRecipes(formattedRecipes);
        setRecommendationMessage('สูตรอาหารแนะนำ');
      }
    } catch (error) {
      console.error('Error fetching random recommendations:', error);
    }
  };

  // Auto-refresh recommendations every 2 minutes
  useEffect(() => {
    // Load initial recommendations
    fetchRecommendedRecipes();
    
    // Set up interval for auto-refresh every 2 minutes (120000ms)
    const interval = setInterval(fetchRecommendedRecipes, 120000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [loggedEmail]); // อัปเดตเมื่อผู้ใช้เปลี่ยน

  // Countdown timer for refresh
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          return 120; // Reset to 2 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const clearFilters = (e) => {
    e?.preventDefault();
    setSelectedDiseases([]);
    setSelectedMeals([]);
    setSearchQuery('');
    setShowDiseasePopup(false);
    setShowMealPopup(false);
  };



  // ===== UI =====
  const menuRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(false);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  return (
    <div className={styles.container}>
      {/* Top Nav */}
      <header className={styles.headerBar}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandIcon}>🍽️</div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Healthy Recipe</span>
              <span className={styles.brandTagline}>สุขภาพดีเริ่มต้นที่อาหาร</span>
            </div>
          </Link>
          <nav className={styles.navRight} ref={menuRef}>
            {/* {isLoggedIn && role === 'admin' && (
              <Link href="/add-recipe" className={styles.linkBtn} title="เพิ่มสูตรอาหาร">
                <FaUtensils /> เพิ่มสูตร
              </Link>
            )} */}
            {!isLoggedIn ? (
              <Link href="/Login" className={styles.loginBtn}>
                เข้าสู่ระบบ
              </Link>
            ) : (
              <div className={styles.profileWrap}>
                <button
                  className={styles.profileBtn}
                  onClick={() => setOpenMenu(v=>!v)}
                  aria-expanded={openMenu}
                  aria-haspopup="menu"
                >
                  <img src={userImage || '/images/GF3.jpg'} alt="avatar" />
                  <span className={styles.profileText}>โปรไฟล์</span>
                </button>
                {openMenu && (
                  <div className={styles.dropdownMenu} role="menu">
                    {role === 'admin' ? (
                      <Link href="/AdminProfileSettings" role="menuitem">
                        <FaCircleUser /> โปรไฟล์แอดมิน
                      </Link>
                    ) : (
                      <Link
                        href={loggedEmail ? `/Profile/UserProfile?email=${encodeURIComponent(loggedEmail)}` : `/Profile/UserProfile`}
                        role="menuitem"
                      >
                        <FaCircleUser /> โปรไฟล์
                      </Link>
                    )}
                    <Link href="/my-bookmarks" role="menuitem">
                      <FaBookmark /> บุ๊กมาร์ก
                    </Link>
                    {role === 'admin' && (
                      <Link href="/AdminDashboard" role="menuitem">
                        <FaUserCog /> แอดมิน
                      </Link>
                    )}
                    <button onClick={handleLogout} role="menuitem" className={styles.dropdownLogout}>
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              <span className={styles.titleMain}>ค้นหาสูตรอาหารเพื่อสุขภาพ</span>
              <span className={styles.titleSub}>อาหารดีมีประโยชน์ สุขภาพแข็งแรง</span>
            </h1>
            <p className={styles.subtitle}>เลือกตามโรคหรือมื้ออาหาร เพื่อเมนูที่ใช่สำหรับคุณ</p>

            <form className={styles.searchBar} onSubmit={(e)=>e.preventDefault()}>
              <div className={styles.searchIcon}>
                <FaSearch aria-hidden />
              </div>
              <input
                type="text"
                placeholder="ค้นหาสูตร/โรค/มื้อ เช่น สลัดอกไก่, เบาหวาน, มื้อเย็น ..."
                value={searchQuery}
                onChange={(e)=>setSearchQuery(e.target.value)}
                aria-label="ค้นหาสูตรอาหาร"
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearInput}
                  onClick={()=>setSearchQuery('')}
                  title="ล้างคำค้น"
                  aria-label="ล้างคำค้น"
                >
                  <FaTimes/>
                </button>
              )}
            </form>

            <div className={styles.quickFilters}>
              <button className={styles.qfBtn} onClick={()=>setShowDiseasePopup(true)}>
                <FaStethoscope/> เลือกตามโรค
              </button>
              <button className={styles.qfBtn} onClick={()=>setShowMealPopup(true)}>
                <FaUtensils/> เลือกตามมื้อ
              </button>
            </div>
          </div>
        </div>

        {(selectedDiseases.length > 0 || selectedMeals.length > 0) && (
  <div className={styles.activeFilters}>
    <div className={styles.tags}>
      {selectedDiseases.map((disease, index) => (
        <span
          key={`disease-${disease.id}`}
          className={styles.tag}
          style={{ backgroundColor: disease.color }}
        >
          {disease.name}
        </span>
      ))}
      {selectedMeals.map((meal, index) => (
        <span
          key={`meal-${meal.id}`}
          className={styles.tag}
          style={{ backgroundColor: meal.color }}
        >
          {meal.name}
        </span>
      ))}
    </div>
    <button 
      type="button" 
      className={styles.clearFiltersMainBtn} 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        clearFilters(e);
      }}
    >
      <FaTimes /> ล้างตัวกรอง
    </button>
  </div>
)}
      </section>

      {/* Auto Recommendation Section */}
      <section className={styles.recommendationSection}>
        <div className={styles.recommendationHeader}>
          <h2 className={styles.recommendationTitle}>
            <span className={styles.recommendationIcon}>✨</span>
            {recommendationMessage}
          </h2>
          <div className={styles.recommendationSubtitle}>
            
          </div>
          <div className={styles.refreshCountdown}>
            <span className={styles.countdownIcon}>⏰</span>
            <span className={styles.countdownText}>
              อัปเดตครั้งถัดไปใน: <span className={styles.countdownTime}>{formatTime(timeUntilRefresh)}</span>
            </span>
          </div>
        </div>

        {recommendationLoading ? (
          <div className={styles.recommendationLoading}>
            <div className={styles.loadingSpinner}></div>
            <p>กำลังโหลดสูตรอาหารแนะนำ...</p>
          </div>
        ) : (
          <div className={styles.recommendationGrid}>
            {recommendedRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`} className={styles.recommendationCard}>
                <div className={styles.recommendationCardMedia}>
                  <img src={normalizeImagePath(recipe.image)} alt={recipe.title} />
                  <div className={styles.recommendationCardOverlay}>
                    <div className={styles.recommendationViewBtn}>
                      <FaUtensils /> ดูสูตร
                    </div>
                  </div>
                </div>
                <div className={styles.recommendationCardBody}>
                  <h3 className={styles.recommendationCardTitle}>{recipe.title}</h3>
                  {recipe.details && <p className={styles.recommendationCardDesc}>{recipe.details}</p>}
                  <div className={styles.recommendationCardTags}>
                    {/* Meal Tags */}
                    {(recipe.mealTypes||[]).length > 0 && (
                      <div className={styles.recommendationMealTagsSection}>
                        <span className={styles.recommendationSectionLabel}>มื้อ:</span>
                        {(recipe.mealTypes||[]).map((mt, index)=> {
                          const colors = ['#FEF08A', '#BBF7D0', '#DDD6FE'];
                          const color = colors[index % colors.length];
                          
                          const displayText = (() => {
                            if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(String(mt).toLowerCase())) {
                              const translateMeal = (meal) => {
                                switch ((meal || '').toLowerCase()) {
                                  case 'breakfast': return 'มื้อเช้า';
                                  case 'lunch': return 'มื้อกลางวัน';
                                  case 'dinner': return 'มื้อเย็น';
                                  case 'snack': return 'ของว่าง';
                                  case 'dessert': return 'ของหวาน';
                                  default: return meal || 'ไม่ระบุ';
                                }
                              };
                              return translateMeal(mt);
                            }
                            return mt;
                          })();
                          
                          return (
                            <span
                              key={`meal-${index}`}
                              className={styles.recommendationMealTag}
                              style={{ 
                                background: color,
                                color: '#000000',
                                borderColor: color,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.7rem'
                              }}
                              title={displayText}
                            >
                              {displayText}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Disease Tags */}
                    {(() => {
                      const uniqueDiseaseTags = getUniqueDiseaseTags(recipe, diseaseCategories);
                      return uniqueDiseaseTags.length > 0 && (
                        <div className={styles.recommendationDiseaseTagsSection}>
                          <span className={styles.recommendationSectionLabel}>โรค:</span>
                          {uniqueDiseaseTags.map((tag, index) => {
                            const diseasePalette = ['#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD', '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'];
                            const getDiseaseColor = (idx) => diseasePalette[idx % diseasePalette.length];
                            return (
                              <span
                                key={`recommendation-disease-tag-${index}`}
                                className={styles.recommendationDiseaseTag}
                                style={{ 
                                  backgroundColor: getDiseaseColor(index),
                                  color: '#000000',
                                  borderColor: getDiseaseColor(index),
                                  padding: '4px 8px',
                                  borderRadius: '16px',
                                  fontSize: '0.7rem'
                                }}
                                title={tag}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recipes */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {selectedDiseases.length > 0 ? 
              `สูตรสำหรับ${selectedDiseases.map(d => d.name).join(', ')}` : 
              'สูตรอาหารทั้งหมด'
            }
          </h2>
          <div className={styles.recipeCount}>
            {filteredRecipes.length} สูตร
          </div>
          {(selectedDiseases.length > 0 || selectedMeals.length > 0 || searchQuery) && (
            <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>
              <FaTimes /> ล้างตัวกรอง
            </button>
          )}
        </div>

        {filteredRecipes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>ไม่พบสูตรที่ตรงเงื่อนไข</h3>
            <p>ลองเปลี่ยนคำค้นหาหรือตัวกรองดูสิ</p>
            <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className={`${styles.recipeGrid} ${
            currentRecipes.length === 1 ? styles.singleRecipe :
            currentRecipes.length === 2 ? styles.twoRecipes :
            currentRecipes.length === 3 ? styles.threeRecipes :
            currentRecipes.length === 4 ? styles.fourRecipes : ''
          }`}>
            {currentRecipes.map((r)=> (
              <Link key={r.id} href={`/recipes/${r.id}`} className={styles.card}>
                <div className={styles.cardMedia}>
                  <img src={normalizeImagePath(r.image)} alt={r.title} />
                  <div className={styles.cardOverlay}>
                    <div className={styles.viewRecipeBtn}>
                      <FaUtensils /> ดูสูตร
                    </div>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{r.title}</h3>
                  {r.details && <p className={styles.cardDesc}>{r.details}</p>}
                  <div className={styles.cardTags}>
                    {/* Meal Tags - แสดงด้านบน */}
                    {(r.mealTypes||[]).length > 0 && (
                      <div className={styles.mealTagsSection}>
                        <span className={styles.sectionLabel}>มื้อ:</span>
                        {(r.mealTypes||[]).map((mt, index)=> {
                          // ใช้สีจาก mealTypes array ตามลำดับ
                          const colors = ['#FEF08A', '#BBF7D0', '#DDD6FE']; // เหลือง, เขียวอ่อน, ม่วงอ่อน
                          const color = colors[index % colors.length];
                          
                          // Fallback: ถ้าข้อมูลยังเป็นภาษาอังกฤษ ให้แปลงเป็นไทย
                          const displayText = (() => {
                            if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(String(mt).toLowerCase())) {
                              const translateMeal = (meal) => {
                                switch ((meal || '').toLowerCase()) {
                                  case 'breakfast': return 'มื้อเช้า';
                                  case 'lunch': return 'มื้อกลางวัน';
                                  case 'dinner': return 'มื้อเย็น';
                                  case 'snack': return 'ของว่าง';
                                  case 'dessert': return 'ของหวาน';
                                  default: return meal || 'ไม่ระบุ';
                                }
                              };
                              return translateMeal(mt);
                            }
                            return mt;
                          })();
                          
                          return (
                            <span
                              key={`meal-${index}`}
                              className={styles.mealTag}
                              style={{ 
                                background: color,
                                color: '#000000',
                                borderColor: color,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.7rem'
                              }}
                              title={displayText}
                            >
                              {displayText}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Disease Tags - แสดงด้านล่าง */}
                    {(() => {
                      const uniqueDiseaseTags = getUniqueDiseaseTags(r, diseaseCategories);
                      return uniqueDiseaseTags.length > 0 && (
                        <div className={styles.diseaseTagsSection}>
                          <span className={styles.sectionLabel}>โรค:</span>
                          {uniqueDiseaseTags.map((tag, index) => {
                            const diseasePalette = ['#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD', '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'];
                            const getDiseaseColor = (idx) => diseasePalette[idx % diseasePalette.length];
                            return (
                              <span
                                key={`disease-tag-${index}`}
                                className={styles.diseaseTag}
                                style={{ 
                                  backgroundColor: getDiseaseColor(index),
                                  color: '#000000',
                                  borderColor: getDiseaseColor(index),
                                  padding: '4px 8px',
                                  borderRadius: '16px',
                                  fontSize: '0.7rem'
                                }}
                                title={tag}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                แสดง {startIndex + 1}-{Math.min(endIndex, filteredRecipes.length)} จาก {filteredRecipes.length} สูตร
              </div>
              <div className={styles.paginationControls}>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← ก่อนหน้า
                </button>
                
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป →
                </button>
              </div>
            </div>
          )}
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Healthy Recipe System</p>
      </footer>

      {/* Disease Popup */}
      {showDiseasePopup && (
        <div className={styles.popupOverlay} role="dialog" aria-modal>
          <div className={styles.popup}>
            <div className={styles.popupHeader}>
              <h3>เลือกตามโรค (สามารถเลือกหลายโรคได้)</h3>
              <button className={styles.closeBtn} onClick={()=>setShowDiseasePopup(false)} aria-label="ปิด"><FaTimes/></button>
            </div>
            <div className={styles.popupContent}>
              <div className={styles.categoryGrid}>
                {diseaseCategories.map((c)=> {
                  const isSelected = selectedDiseases.some(d => d.id === c.id);
                  return (
                    <button
                      key={c.id}
                      className={`${styles.categoryCard} ${isSelected ? styles.selected : ''}`}
                      style={{ 
                        background: isSelected ? c.color : 'transparent',
                        borderColor: c.color,
                        borderWidth: '2px',
                        borderStyle: 'solid'
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDiseases(prev => prev.filter(d => d.id !== c.id));
                        } else {
                          setSelectedDiseases(prev => [...prev, c]);
                        }
                      }}
                      title={`${isSelected ? 'ยกเลิกเลือก' : 'เลือก'}โรค: ${c.name}`}
                      aria-label={`${isSelected ? 'ยกเลิกเลือก' : 'เลือก'}โรค ${c.name}`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meal Popup */}
      {showMealPopup && (
        <div className={styles.popupOverlay} role="dialog" aria-modal>
          <div className={styles.popup}>
            <div className={styles.popupHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>เลือกตามมื้ออาหาร</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  เลือกตามมื้ออาหารเพื่อแยกหารเมนูที่ใช่สำหรับคุณ
                </p>
              </div>
              <button className={styles.closeBtn} onClick={()=>setShowMealPopup(false)} aria-label="ปิด"><FaTimes/></button>
            </div>
            <div className={styles.popupContent}>
              <div className={styles.mealGrid}>
                {mealTypes.map((m)=> {
                  const isSelected = selectedMeals.some(meal => meal.id === m.id);
                  return (
                    <button
                      key={m.id}
                      className={`${styles.mealCard} ${styles[m.id]} ${isSelected ? styles.selected : ''}`}
                      style={{ 
                        background: isSelected ? m.color : 'transparent',
                        borderColor: m.color,
                        borderWidth: '2px',
                        borderStyle: 'solid'
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedMeals(prev => prev.filter(meal => meal.id !== m.id));
                        } else {
                          setSelectedMeals(prev => [...prev, m]);
                        }
                      }}
                      title={`${isSelected ? 'ยกเลิกเลือก' : 'เลือก'}มื้อ: ${m.name}`}
                      aria-label={`${isSelected ? 'ยกเลิกเลือก' : 'เลือก'}มื้อ ${m.name}`}
                    >
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(){
  const fallbackColors = ['#FFB6C1','#ADD8E6','#FFD700','#98FB98','#DDA0DD','#F0E68C','#AFE1AF','#F9C5D5'];
  const mealIdToKey = (v)=>{
    const m=String(v??'').trim();
    if(m==='1')return'breakfast';
    if(m==='2')return'lunch';
    if(m==='3')return'dinner';
    if(['breakfast','lunch','dinner'].includes(m)) return m;
    return '';
  };

  // แปลงชื่อมื้ออาหารจากอังกฤษเป็นไทย
  const translateMeal = (meal) => {
    switch ((meal || '').toLowerCase()) {
      case 'breakfast':
        return 'มื้อเช้า';
      case 'lunch':
        return 'มื้อกลางวัน';
      case 'dinner':
        return 'มื้อเย็น';
      case 'snack':
        return 'ของว่าง';
      case 'dessert':
        return 'ของหวาน';
      default:
        return meal || 'ไม่ระบุ';
    }
  };
  try {
    let pool;
    try { const mod = await import('./lib/db'); pool = mod.default || mod; }
    catch { const mod2 = await import('../lib/db'); pool = mod2.default || mod2; }

    let recipesRows = [];
    let diseasesRows = [];

    try {
      [recipesRows] = await pool.execute(
        `SELECT Recipe_code, Image, details, Recipe_name, Meal, Disease_code, Disease_tags 
         FROM recipes
         ORDER BY Recipe_code DESC`
      );
    } catch (e) {
      const mysql = (await import('mysql2/promise')).default;
      const fb = mysql.createPool({
        host:'127.0.0.1',port:3306,user:'root',password:'',database:'food_recipes',
        waitForConnections:true,connectionLimit:10,queueLimit:0
      });
      const r = await fb.execute(
        'SELECT `Recipe_code`,`Image`,`details`,`Recipe_name`,`Meal`,`Disease_code`,`Disease_tags` FROM `recipes`'
      );
      recipesRows = r[0];
    }

    try {
      [diseasesRows] = await pool.execute(
        'SELECT `Disease_code` AS id, `Disease_type` AS name FROM `diseases` ORDER BY `Disease_type` ASC'
      );
    } catch {
      diseasesRows = [];
    }

    const initialRecipes = (recipesRows||[]).map((r)=>{
      // แปลง Disease_tags จาก string เป็น array
      const diseaseTags = r?.Disease_tags ? 
        String(r.Disease_tags).split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      // แปลง Meal จาก string เป็น array (รองรับหลายมื้อ)
      let mealTypesArray = [];
      if (r?.Meal) {
        const mealString = String(r.Meal);
        // ตรวจสอบว่าเป็น JSON array หรือไม่
        if (mealString.startsWith('[') && mealString.endsWith(']')) {
          try {
            const parsedMeals = JSON.parse(mealString);
            if (Array.isArray(parsedMeals)) {
              mealTypesArray = parsedMeals.map(meal => {
                // ถ้าเป็นชื่อมื้อภาษาอังกฤษโดยตรง ให้แปลงเป็นไทยเลย
                if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(String(meal).toLowerCase())) {
                  return translateMeal(meal);
                }
                // ถ้าเป็นตัวเลข ให้แปลงเป็น key ก่อน แล้วค่อยแปลงเป็นไทย
                return translateMeal(mealIdToKey(meal));
              }).filter(Boolean);
            }
          } catch (e) {
            // ถ้า parse ไม่ได้ ให้ใช้วิธีเดิม
            mealTypesArray = mealIdToKey(mealString) ? [translateMeal(mealIdToKey(mealString))] : [];
          }
        } else {
          // ถ้าเป็น string ปกติ (คั่นด้วยจุลภาค)
          const meals = mealString.split(',').map(m => m.trim()).filter(Boolean);
          mealTypesArray = meals.map(meal => {
            // ถ้าเป็นชื่อมื้อภาษาอังกฤษโดยตรง ให้แปลงเป็นไทยเลย
            if (['breakfast', 'lunch', 'dinner', 'snack', 'dessert'].includes(meal.toLowerCase())) {
              return translateMeal(meal);
            }
            // ถ้าเป็นตัวเลข ให้แปลงเป็น key ก่อน แล้วค่อยแปลงเป็นไทย
            return translateMeal(mealIdToKey(meal));
          }).filter(Boolean);
        }
      }
      

      return {
        id: Number(r?.Recipe_code),
        title: r?.Recipe_name || 'ไม่ทราบชื่อ',
        image: r?.Image || '/images/GF3.jpg',
        details: r?.details || '',
        mealTypes: mealTypesArray,
        diseases: r?.Disease_code ? [Number(r.Disease_code)] : [],
        tags: diseaseTags, // เพิ่ม tags array
      };
    }).filter(x=>Number.isFinite(x.id));

    const diseaseCategories = (diseasesRows||[]).map((d,idx)=>({
      id: Number(d.id),
      name: d.name || 'ไม่ทราบชื่อโรค',
      color: fallbackColors[idx % fallbackColors.length],
    }));

    return { props: { initialRecipes, diseaseCategories } };
  } catch (err) {
    console.error('Home getServerSideProps error:', err);
    return { props: { initialRecipes: [], diseaseCategories: [] } };
  }
}