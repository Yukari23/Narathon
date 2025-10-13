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
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showDiseasePopup, setShowDiseasePopup] = useState(false);
  const [showMealPopup, setShowMealPopup] = useState(false);

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

  const filteredRecipes = useMemo(() => {
  const q = norm(searchQuery);

  return recipes.filter((r) => {
    // ----- กรองตามโรคที่เลือก (เหมือนเดิม) -----
    const byDisease = !selectedDisease || (r.diseases || []).includes(Number(selectedDisease.id));

    // ----- กรองตามมื้อที่เลือก (เหมือนเดิม) -----
    const byMeal = !selectedMeal || (r.mealTypes || []).includes(selectedMeal.id);

    // ----- ค้นจากช่องค้นหา: ชื่อเมนู / รายละเอียด / ชื่อโรค / ชื่อมื้อ -----
    if (!q) return byDisease && byMeal;

    const titleStr   = norm(r.title);
    const detailStr  = norm(r.details);

    // รวมชื่อโรคของสูตรนี้ (เช่น “เบาหวาน”, “ไต”, …)
    const diseaseNameList = (r.diseases || [])
      .map(id => norm(getDiseaseById(id)?.name))
      .filter(Boolean);

    // รวมชื่อมื้อของสูตรนี้ (เช่น “มื้อเช้า”, “มื้อเย็น”)
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
}, [recipes, selectedDisease, selectedMeal, searchQuery, diseaseCategories, mealTypes]);


  const clearFilters = (e) => {
    e?.preventDefault();
    setSelectedDisease(null);
    setSelectedMeal(null);
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

        {(selectedDisease || selectedMeal) && (
  <div className={styles.activeFilters}>
    <div className={styles.tags}>
      {selectedDisease && (
        <span
          className={styles.tag}
          style={{ backgroundColor: selectedDisease.color }}
        >
          {selectedDisease.name}
        </span>
      )}
      {selectedMeal && (
        <span
          className={styles.tag}
          style={{ backgroundColor: selectedMeal.color }}
        >
          {selectedMeal.name}
        </span>
      )}
    </div>
  </div>
)}
      </section>

      {/* Recipes */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {selectedDisease ? `สูตรสำหรับ${selectedDisease.name}` : 'สูตรอาหารแนะนำ'}
          </h2>
          <div className={styles.recipeCount}>
            {filteredRecipes.length} สูตร
          </div>
          {(selectedDisease || selectedMeal || searchQuery) && (
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
          <div className={styles.recipeGrid}>
            {filteredRecipes.map((r)=> (
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
                    {/* Disease Tags */}
                    {(r.diseases||[]).map((diseaseId)=>{
                      const disease = diseaseCategories.find(x=>x.id===diseaseId);
                      const diseasePalette = ['#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD', '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'];
                      const getDiseaseColor = (id) => diseasePalette[(Number(id) || 0) % diseasePalette.length];
                      return disease ? (
                        <span
                          key={diseaseId}
                          className={styles.diseaseTag}
                          style={{ 
                            backgroundColor: getDiseaseColor(diseaseId),
                            color: '#000000',
                            borderColor: getDiseaseColor(diseaseId),
                            padding: '4px 8px',
                            borderRadius: '16px',
                            fontSize: '0.7rem'
                          }}
                          title={disease.name}
                        >
                          {disease.name}
                        </span>
                      ) : null;
                    })}
                    
                    {/* Meal Tags */}
                    {(r.mealTypes||[]).map((mt)=> {
                      const m = mealTypes.find(x=>x.id===mt);
                      return (
                        <span
                          key={mt}
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
                          {m?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Link>
            ))}
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
              <h3>เลือกตามโรค</h3>
              <button className={styles.closeBtn} onClick={()=>setShowDiseasePopup(false)} aria-label="ปิด"><FaTimes/></button>
            </div>
            <div className={styles.popupContent}>
              <div className={styles.categoryGrid}>
                {diseaseCategories.map((c)=> (
                  <button
                    key={c.id}
                    className={styles.categoryCard}
                    style={{ background: c.color }}
                    onClick={() => { setSelectedDisease(c); setShowDiseasePopup(false); }}
                    title={`เลือกโรค: ${c.name}`}
                    aria-label={`เลือกโรค ${c.name}`}
                  >
                    <span>{c.name}</span>
                  </button>
                ))}
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
              <h3>เลือกตามมื้ออาหาร</h3>
              <button className={styles.closeBtn} onClick={()=>setShowMealPopup(false)} aria-label="ปิด"><FaTimes/></button>
            </div>
            <div className={styles.popupContent}>
              <div className={styles.mealGrid}>
                {mealTypes.map((m)=> (
                  <button
                    key={m.id}
                    className={`${styles.mealCard} ${styles[m.id]}`}
                    style={{ background: m.color }}
                    onClick={() => { setSelectedMeal(m); setShowMealPopup(false); }}
                    title={`เลือกมื้อ: ${m.name}`}
                    aria-label={`เลือกมื้อ ${m.name}`}
                  >
                    <span>{m.name}</span>
                  </button>
                ))}
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
  try {
    let pool;
    try { const mod = await import('../lib/db'); pool = mod.default || mod; }
    catch { const mod2 = await import('./lib/db'); pool = mod2.default || mod2; }

    let recipesRows = [];
    let diseasesRows = [];

    try {
      [recipesRows] = await pool.execute(
        `SELECT Recipe_code, Image, details, Recipe_name, Meal, Disease_code 
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
        'SELECT `Recipe_code`,`Image`,`details`,`Recipe_name`,`Meal`,`Disease_code` FROM `recipes`'
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

    const initialRecipes = (recipesRows||[]).map((r)=>({
      id: Number(r?.Recipe_code),
      title: r?.Recipe_name || 'ไม่ทราบชื่อ',
      image: r?.Image || '/images/GF3.jpg',
      details: r?.details || '',
      mealTypes: mealIdToKey(r?.Meal) ? [mealIdToKey(r?.Meal)] : [],
      diseases: r?.Disease_code ? [Number(r.Disease_code)] : [],
    })).filter(x=>Number.isFinite(x.id));

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