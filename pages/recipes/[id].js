// /pages/recipe/[id].js
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/RecipeDetail.module.css';
import { FaCommentDots, FaBookmark, FaTrash, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

// จัด path รูปจาก /public
function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}
  // 🔹 แปลงชื่อมื้ออาหารจากอังกฤษเป็นไทย
function translateMeal(meal) {
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
}


export default function RecipeDetail({ recipe }) {
  const router = useRouter();

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State สำหรับการแก้ไขคอมเม้น
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [updating, setUpdating] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🔹 เก็บข้อมูลแอดมิน (ใช้ตรวจและแสดงรูป)
  const [adminInfo, setAdminInfo] = useState({
    email: '',
    name: 'แอดมิน',
    image: '/images/GF3.jpg'
  });

  const bottomRef = useRef(null);
  const shouldScrollAfterPostRef = useRef(false);

  const getMemberEmail = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('memberEmail') || localStorage.getItem('userEmail');
  };

  const getUserRole = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userRole');
  };

  // ตรวจสอบสถานะการล็อกอิน
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const email = getMemberEmail();
      setIsLoggedIn(!!(token && email));
    }
  }, []);

  // 🔹 ดึงข้อมูลแอดมิน (email/name/image)
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const res = await fetch('/api/admin');
        if (res.ok) {
          const data = await res.json();
          if (data.admin) {
            setAdminInfo({
              email: data.admin.email || '',
              name: data.admin.name || 'แอดมิน',
              image: normalizeImagePath(data.admin.image || '/images/GF3.jpg')
            });
          }
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
      }
    };

    fetchAdminInfo();
  }, []);

  // โหลดคอมเมนต์
  useEffect(() => {
    if (!recipe?.id) return;
    (async () => {
      try {
        setLoadingComments(true);
        const res = await fetch(`/api/comments?recipeId=${recipe.id}`);
        if (!res.ok) throw new Error(`GET /comments ${res.status}`);
        const data = await res.json();
        const list = [...(data?.comments || [])]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(c => massageCommentWithAdminInfo(c, adminInfo));
        setComments(list);
      } catch (e) {
        console.error(e);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, adminInfo.email, adminInfo.image, adminInfo.name]);

  useEffect(() => {
    if (shouldScrollAfterPostRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      shouldScrollAfterPostRef.current = false;
    }
  }, [comments]);

  // บุ๊กมาร์ก
  useEffect(() => {
    (async () => {
      if (!recipe?.id) return;
      const email = getMemberEmail();
      if (!email) { setIsBookmarked(false); return; }
      try {
        const url = `/api/bookmarks?email=${encodeURIComponent(email)}&recipeId=${encodeURIComponent(recipe.id)}`;
        const res = await fetch(url);
        if (!res.ok) { setIsBookmarked(false); return; }
        const j = await res.json();
        setIsBookmarked(!!j.bookmarked);
      } catch (err) {
        console.error('check bookmark error:', err);
        setIsBookmarked(false);
      }
    })();
  }, [recipe?.id]);

  const massageCommentWithAdminInfo = (comment, admin) => {
    const isAdmin = admin.email && comment?.memberEmail && comment.memberEmail.toLowerCase() === admin.email.toLowerCase();
    if (!isAdmin) return {
      ...comment,
      authorImage: normalizeImagePath(comment.authorImage),
    };
    // ถ้าเป็นของแอดมิน: ใช้ชื่อ/รูปของแอดมินเสมอ
    return {
      ...comment,
      authorName: admin.name || comment.authorName || 'แอดมิน',
      authorImage: admin.image || '/images/GF3.jpg',
      isAdmin: true,
    };
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // ตรวจสอบการล็อกอิน
    if (!isLoggedIn) {
      setErrorMsg('กรุณาล็อกอินก่อนคอมเม้น');
      const next = encodeURIComponent(`/recipe/${recipe.id}`);
      return router.push(`/Login?next=${next}`);
    }
    
    const body = newComment.trim();
    if (!body) return setErrorMsg('กรุณาพิมพ์ข้อความก่อนส่ง');

    try {
      setPosting(true);
      const actorEmail = getMemberEmail();
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // ส่งอีเมลผู้กระทำให้ API ตรวจสิทธิ์
          'x-user-email': actorEmail || ''
        },
        body: JSON.stringify({ recipeId: recipe.id, body })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'ส่งคอมเมนต์ไม่สำเร็จ');
      }
      const j = await res.json();
      let created = j?.comment;

      // 🔹 ถ้าเป็นแอดมินที่คอมเมนต์ — ใส่รูป/ชื่อแอดมินให้เลย
      const role = getUserRole();
      if (role === 'admin') {
        created = {
          ...created,
          authorName: adminInfo.name || created?.authorName || 'แอดมิน',
          authorImage: adminInfo.image || '/images/GF3.jpg',
          memberEmail: adminInfo.email || created?.memberEmail,
          isAdmin: true,
        };
      } else {
        // ผู้ใช้ทั่วไป — normalize รูป
        created = {
          ...created,
          authorImage: normalizeImagePath(created?.authorImage),
        };
      }

      if (created) {
        setComments(prev => [created, ...prev].sort((a,b)=>new Date(b.date)-new Date(a.date)));
        shouldScrollAfterPostRef.current = true;
      }
      setNewComment('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleBookmark = async () => {
    if (!recipe?.id) return;
    const email = getMemberEmail();
    if (!email) {
      alert('โปรดล็อกอินก่อนบุ๊กมาร์กอาหาร');
      const next = encodeURIComponent(`/recipe/${recipe.id}`);
      return router.push(`/Login?next=${next}`);
    }
    try {
      setBookmarkLoading(true);
      const method = isBookmarked ? 'DELETE' : 'POST';
      const res = await fetch('/api/bookmarks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recipeId: recipe.id })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'ไม่สามารถอัปเดตบุ๊กมาร์กได้');
      }
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('คุณต้องการลบคอมเม้นต์นี้หรือไม่?')) return;
    
    try {
      const actorEmail = getMemberEmail();
      const res = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
        headers: {
          // ส่งอีเมลผู้กระทำให้ API ตรวจสิทธิ์ (เจ้าของหรือแอดมิน)
          'x-user-email': actorEmail || ''
        }
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'ไม่สามารถลบคอมเม้นต์ได้');
      }
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // เริ่มแก้ไขคอมเม้น
  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.body);
  };

  // ยกเลิกการแก้ไข
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  // บันทึกการแก้ไข
  const handleSaveEdit = async () => {
    if (!editCommentText.trim()) {
      setErrorMsg('กรุณาพิมพ์ข้อความก่อนบันทึก');
      return;
    }

    try {
      setUpdating(true);
      setErrorMsg('');
      
      const actorEmail = getMemberEmail();
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': actorEmail || ''
        },
        body: JSON.stringify({
          id: editingCommentId,
          body: editCommentText.trim()
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'แก้ไขคอมเม้นต์ไม่สำเร็จ');
      }

      const result = await res.json();
      
      // อัปเดตคอมเม้นต์ใน state
      setComments(prev => prev.map(c => 
        c.id === editingCommentId 
          ? { ...c, body: editCommentText.trim() }
          : c
      ));

      // รีเซ็ต state
      setEditingCommentId(null);
      setEditCommentText('');
      
    } catch (error) {
      console.error('Error updating comment:', error);
      setErrorMsg(error.message || 'แก้ไขคอมเม้นต์ไม่สำเร็จ');
    } finally {
      setUpdating(false);
    }
  };

  if (!recipe) {
    return (
      <div className={styles.container}>
        <p>ไม่พบสูตรอาหาร</p>
        <Link href="/">กลับหน้าหลัก</Link>
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
            <h1 className={styles.title}>{recipe.title}</h1>
            {/* แสดงชื่อนักเขียน */}
            {/* <div className={styles.metaRow}>
              <div className={styles.authorRow}>
                <img 
                  className={styles.avatar} 
                  src={adminInfo.image} 
                  alt="admin avatar"
                  onError={(e) => { e.target.src = '/images/GF3.jpg'; }}
                />
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>{adminInfo.name}</span>
                  <span className={styles.authorRole}>ผู้เชี่ยวชาญด้านอาหาร</span>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      <div className={styles.heroWrapper}>
        <img className={styles.heroImage} src={normalizeImagePath(recipe.image)} alt={recipe.title} />
      </div>

      <div className={styles.actionRow}>
        <div className={styles.actionContent}>
          <button
            className={`${styles.actionBtn} ${isBookmarked ? styles.bookmarked : ''}`}
            onClick={toggleBookmark}
            disabled={bookmarkLoading || !isLoggedIn}
            aria-pressed={isBookmarked}
            title={isBookmarked ? 'ยกเลิกการบุ๊กมาร์กนี้' : 'บุ๊กมาร์กสูตรนี้'}
          >
            <FaBookmark className={styles.actionIcon} />
            <span className={styles.actionText}>
              {bookmarkLoading ? 'กำลังอัปเดต…' : isBookmarked ? 'บุ๊กมาร์กแล้ว' : 'บุ๊กมาร์กสูตร'}
            </span>
          </button>
          <div className={styles.recipeStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{comments.length}</span>
              <span className={styles.statLabel}>ความคิดเห็น</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{recipe.ingredients?.length || 0}</span>
              <span className={styles.statLabel}>ส่วนผสม</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{recipe.steps?.length || 0}</span>
              <span className={styles.statLabel}>ขั้นตอน</span>
            </div>
          </div>
        </div>
      </div>

      {recipe.details && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>คำอธิบาย</h2>
          <p className={styles.description}>{recipe.details}</p>
        </div>
      )}

      {((recipe.ingredients?.length || 0) > 0 || (recipe.steps?.length || 0) > 0) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>ส่วนผสมและวิธีทำ</h2>
          <div className={styles.comparisonContainer}>
            {/*วัตถุดิบ */}
            {(recipe.ingredients?.length || 0) > 0 && (
              <div className={styles.comparisonColumn}>
                <div className={`${styles.columnTitle} ${styles.ingredientsColumn}`}>
                  📋วัตถุดิบ
                </div>
                <ul className={styles.ingredientList}>
                  {recipe.ingredients.map((row, idx) => (
                    <li key={idx} className={styles.ingredientRow}>
                      <span className={styles.itemNo}>{idx + 1}</span>
                      <span className={styles.ingredientName}>{row.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* วิธีทำ */}
            {(recipe.steps?.length || 0) > 0 && (
              <div className={styles.comparisonColumn}>
                <div className={`${styles.columnTitle} ${styles.stepsColumn}`}>
                  👨‍🍳 วิธีทำ
                </div>
                <ul className={styles.stepList}>
                  {recipe.steps.map((row, idx) => (
                    <li key={idx} className={styles.stepItem}>
                      <span className={styles.itemNo}>{idx + 1}</span>
                      <span className={styles.stepContent}>{row.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}


      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><FaCommentDots /> ความคิดเห็น</h2>
        <div className={styles.commentList}>
          {loadingComments ? (
            <div className={styles.commentLoading}>กำลังโหลดความคิดเห็น…</div>
          ) : comments.length === 0 ? (
            <div className={styles.commentEmpty}>ยังไม่มีความคิดเห็น</div>
          ) : (
            comments.map((c) => {
              const currentUserEmail = (getMemberEmail() || '').toLowerCase();
              const role = getUserRole();
              const isOwner = (c.memberEmail || '').toLowerCase() === currentUserEmail;
              const isAdminUser = role === 'admin';
              const canDelete = isOwner || isAdminUser;
              const canEdit = isOwner; // เฉพาะเจ้าของเท่านั้นที่แก้ไขได้

              const avatar = c.isAdmin ? adminInfo.image : normalizeImagePath(c.authorImage);
              const displayName = c.isAdmin ? (adminInfo.name || 'แอดมิน') : (c.authorName || 'ผู้ใช้ไม่ระบุ');
              
              return (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentAuthorInfo}>
                      <img 
                        src={avatar} 
                        alt="Profile" 
                        className={styles.commentAvatar}
                        onError={(e) => { e.target.src = '/images/GF3.jpg'; }}
                      />
                      <div className={styles.commentAuthorDetails}>
                        <span className={styles.commentAuthor}>
                          {displayName}{c.isAdmin ? ' (แอดมิน)' : ''}
                        </span>
                        <span className={styles.commentTime}>
                          {c.date ? new Date(c.date).toLocaleString('th-TH') : ''}
                        </span>
                      </div>
                    </div>
                    {isLoggedIn && (canEdit || canDelete) && (
                      <div className={styles.commentActions}>
                        {canEdit && (
                          <button
                            className={styles.editCommentBtn}
                            onClick={() => handleStartEdit(c)}
                            title="แก้ไขคอมเม้นต์"
                            aria-label="แก้ไขคอมเม้นต์"
                          >
                            <FaEdit />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className={styles.deleteCommentBtn}
                            onClick={() => handleDeleteComment(c.id)}
                            title="ลบคอมเม้นต์"
                            aria-label="ลบคอมเม้นต์"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* แสดงเนื้อหาคอมเม้นหรือฟอร์มแก้ไข */}
                  {editingCommentId === c.id ? (
                    <div className={styles.editCommentForm}>
                      <textarea
                        className={styles.editCommentInput}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        rows={3}
                        placeholder="แก้ไขความคิดเห็นของคุณ..."
                      />
                      <div className={styles.editCommentActions}>
                        <button
                          className={styles.saveEditBtn}
                          onClick={handleSaveEdit}
                          disabled={updating || !editCommentText.trim()}
                        >
                          {updating ? 'กำลังบันทึก...' : <><FaCheck /> บันทึก</>}
                        </button>
                        <button
                          className={styles.cancelEditBtn}
                          onClick={handleCancelEdit}
                          disabled={updating}
                        >
                          <FaTimes /> ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.commentBody}>{c.body}</p>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {isLoggedIn ? (
          <form onSubmit={handleSubmitComment} className={styles.commentForm}>
            <textarea
              className={styles.commentInput}
              placeholder="พิมพ์ความคิดเห็นของคุณ…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            {errorMsg && <div className={styles.commentError}>{errorMsg}</div>}
            <button className={styles.commentSubmit} disabled={posting}>
              {posting ? 'กำลังส่ง…' : 'ส่งความคิดเห็น'}
            </button>
          </form>
        ) : (
          <div className={styles.commentLoginPrompt}>
            <p>กรุณาล็อกอินเพื่อแสดงความคิดเห็น</p>
            <Link href={`/Login?next=${encodeURIComponent(`/recipe/${recipe.id}`)}`} className={styles.loginBtn}>
              เข้าสู่ระบบ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Server-side =====
// ===== Server-side =====
export async function getServerSideProps(context) {
  const { id } = context.params || {};

  try {
    // พยายาม import จาก /pages/lib/db ก่อน (กรณีโครงสร้างคุณวาง lib ไว้ใต้ /pages)
    let poolMod;
    try {
      poolMod = await import('../lib/db');
    } catch (e1) {
      // ถ้าไม่เจอ ให้ลองจาก /lib/db ที่รากโปรเจกต์
      poolMod = await import('../../lib/db');
    }
    const pool = poolMod.default;

    // ... โค้ดเดิมของคุณต่อจากนี้ (query recipes ฯลฯ)

    let r = null;
    try {
      const [rows] = await pool.execute(
        'SELECT `Recipe_code`,`Image`,`details`,`Recipe_name`,`Meal`,`method`,`raw_material`,`Disease_tags`,`Disease_code` FROM `recipes` WHERE `Recipe_code` = ? LIMIT 1',
        [id]
      );
      r = rows?.[0] || null;
    } catch (primaryErr) {
      try {
        const mysql = (await import('mysql2/promise')).default;
        const fallbackPool = mysql.createPool({
          host: '127.0.0.1',
          port: 3306,
          user: 'root',
          password: '',
          database: 'food_recipes',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
        const [rows2] = await fallbackPool.execute(
          'SELECT `Recipe_code`,`Image`,`details`,`Recipe_name`,`Meal`,`method`,`raw_material`,`Disease_tags`,`Disease_code` FROM `recipes` WHERE `Recipe_code` = ? LIMIT 1',
          [id]
        );
        r = rows2?.[0] || null;
      } catch (fallbackErr) {
        throw primaryErr;
      }
    }

    if (!r) return { props: { recipe: null } };

    const parseList = (v) => {
      if (v == null) return [];
      let s = String(v).trim();
      for (let i = 0; i < 3; i++) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            if (parsed.length === 1 && typeof parsed[0] === 'string' && /^\s*\[/.test(parsed[0])) {
              s = parsed[0];
              continue;
            }
            return parsed.map(x => String(x).trim()).filter(Boolean);
          }
          if (typeof parsed === 'string') { s = parsed; continue; }
        } catch {}
        break;
      }
      return s
        .replace(/\r\n?/g, '\n')
        .split(/\n|,|;/)
        .map(t => t.trim())
        .filter(Boolean);
    };

    const splitByComma = (value) =>
      String(value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const steps = parseList(r.method).map((text, idx) => ({ no: idx + 1, text }));
    const ingredients = parseList(r.raw_material).map((name, idx) => ({ no: idx + 1, name }));

    const recipe = {
      id: r.Recipe_code,
      title: r.Recipe_name || 'ไม่ทราบชื่อ',
      image: normalizeImagePath(r.Image),
      details: String(r.details || '').replace(/\r\n?/g, '\n').trim(),
      mealTypes: r.Meal ? [translateMeal(r.Meal)] : [],
      diseases: r.Disease_code ? [Number(r.Disease_code)] : [],
      ingredients,
      steps,
      tags: splitByComma(r.Disease_tags),
      author: null,
      authorName: null,
    };

    return { props: { recipe } };
  } catch (error) {
    console.error('recipe detail error:', error);
    return { props: { recipe: null } };
  }
}
