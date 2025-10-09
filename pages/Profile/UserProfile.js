// /pages/Profile/UserProfile.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../../styles/Profile/UserProfile.module.css';
import { FaUser, FaEdit, FaArrowLeft, FaStethoscope, FaCheck, FaTimes } from 'react-icons/fa';

function mapMember(row) {
  let image = row.Image || '/images/default-avatar.png';
  const isHttp = /^https?:\/\//i.test(image);
  if (!isHttp) {
    image = image.replace(/^\/?public\//, '/');
    if (!image.startsWith('/')) image = '/' + image;
  }
  const diseaseTags = (row.Disease_tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  return {
    name: row.First_name,
    email: row.Email_member,
    image,
    diseaseTags,
  };
}

export default function UserProfile({ user, diseases = [], reason }) {
  const router = useRouter();

  // ---------- เช็กสิทธิ์จาก localStorage (ฝั่ง client) ----------
  const [currentEmail, setCurrentEmail] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'member' | null
  const [canView, setCanView] = useState(false); // สิทธิ์ดูบุ๊กมาร์ก/ตั้งค่า

  // ---------- จัดการแท็กโรค ----------
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const me =
      typeof window !== 'undefined'
        ? (localStorage.getItem('memberEmail') ||
           localStorage.getItem('userEmail') || null)
        : null;
    const r = typeof window !== 'undefined' ? (localStorage.getItem('userRole') || null) : null;
    setCurrentEmail(me);
    setRole(r);
  }, []);

  // 🔁 ถ้า SSR ได้ user.email ที่ไม่ตรงกับอีเมลที่ล็อกอิน → redirect ไป URL ที่มี ?email=<ของเรา>
  useEffect(() => {
    if (!router.isReady) return;
    if (!currentEmail) return;
    if (user?.email && currentEmail !== user.email) {
      const url = `/Profile/UserProfile?email=${encodeURIComponent(currentEmail)}`;
      router.replace(url);
    }
  }, [router, currentEmail, user?.email]);

  useEffect(() => {
    // เจ้าของโปรไฟล์ หรือ admin เท่านั้น
    setCanView(!!user?.email && (currentEmail === user.email || role === 'admin'));
  }, [currentEmail, role, user?.email]);

  // โหลดแท็กโรคของผู้ใช้
  useEffect(() => {
    if (user?.diseaseTags) {
      setSelectedDiseases(user.diseaseTags);
    }
  }, [user?.diseaseTags]);

  // จัดการการเลือก/ยกเลิกแท็กโรค
  const toggleDisease = (diseaseName) => {
    if (selectedDiseases.includes(diseaseName)) {
      setSelectedDiseases(prev => prev.filter(d => d !== diseaseName));
    } else {
      setSelectedDiseases(prev => [...prev, diseaseName]);
    }
  };

  // บันทึกแท็กโรค
  const saveDiseaseTags = async () => {
    if (!user?.email || !canView) return;
    
    setSaving(true);
    setSaveMessage('');
    
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          diseaseTags: selectedDiseases.join(',')
        })
      });
      
      if (res.ok) {
        setSaveMessage('บันทึกแท็กโรคเรียบร้อยแล้ว');
        setIsEditing(false);
        // อัปเดตข้อมูลผู้ใช้
        user.diseaseTags = selectedDiseases;
      } else {
        const data = await res.json();
        setSaveMessage(data.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error saving disease tags:', error);
      setSaveMessage('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  // ยกเลิกการแก้ไข
  const cancelEdit = () => {
    setSelectedDiseases(user?.diseaseTags || []);
    setIsEditing(false);
    setSaveMessage('');
  };


  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <FaUser className={styles.errorIcon} />
          <h2>ไม่พบข้อมูลสมาชิก</h2>
          <p>{reason ? `(${reason})` : 'ไม่สามารถโหลดข้อมูลได้'}</p>
          <Link href="/" className={styles.backBtn}>
            <FaArrowLeft /> กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <FaArrowLeft /> กลับหน้าหลัก
        </Link>
        <h1 className={styles.pageTitle}>โปรไฟล์ของฉัน</h1>
      </div>

      {/* โปรไฟล์ */}
      <div className={styles.profileCard}>
        <div className={styles.profileImageContainer}>
          {user.image && user.image !== '/images/default-avatar.png' ? (
            <Image
              src={user.image}
              alt="Profile"
              width={150}
              height={150}
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.defaultAvatar}>
              <FaUser />
            </div>
          )}
        </div>
        <div className={styles.profileInfo}>
          <h2 className={styles.userName}>{user.name || 'ผู้ใช้'}</h2>
          <p className={styles.email}>{user.email}</p>
          {canView && (
            <div className={styles.profileActions}>
              <Link href="/Profile/ProfileSettings" className={styles.editBtn}>
                <FaEdit /> ตั้งค่าโปรไฟล์
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* แท็กโรคที่สนใจ */}
      {canView && (
        <div className={styles.diseaseSection}>
          <div className={styles.sectionHeader}>
            <h3><FaStethoscope /> โรคที่สนใจ</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={styles.editDiseaseBtn}
              >
                <FaEdit /> แก้ไข
              </button>
            )}
          </div>

          {isEditing ? (
            <div className={styles.editMode}>
              <div className={styles.diseaseGrid}>
                {diseases.map(disease => (
                  <button
                    key={disease.id}
                    type="button"
                    className={`${styles.diseaseChip} ${
                      selectedDiseases.includes(disease.name) ? styles.selected : ''
                    }`}
                    onClick={() => toggleDisease(disease.name)}
                  >
                    <FaStethoscope /> {disease.name}
                    {selectedDiseases.includes(disease.name) && (
                      <FaCheck className={styles.checkIcon} />
                    )}
                  </button>
                ))}
              </div>
              
              <div className={styles.editActions}>
                <button
                  onClick={saveDiseaseTags}
                  disabled={saving}
                  className={styles.saveBtn}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className={styles.cancelBtn}
                >
                  <FaTimes /> ยกเลิก
                </button>
              </div>
              
              {saveMessage && (
                <div className={`${styles.message} ${
                  saveMessage.includes('เรียบร้อย') ? styles.success : styles.error
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.displayMode}>
              {selectedDiseases.length > 0 ? (
                <div className={styles.selectedDiseases}>
                  {selectedDiseases.map((disease, index) => (
                    <span key={index} className={styles.diseaseTag}>
                      <FaStethoscope /> {disease}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.noDiseases}>ยังไม่ได้เลือกโรคที่สนใจ</p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ---------- SSR ----------
export async function getServerSideProps({ query }) {
  const { default: pool } = await import('../lib/db');

  const email = query.email || null;
  let user = null;
  let diseases = [];
  let reason = '';

  try {
    // ดึงข้อมูลโรค
    const [diseaseRows] = await pool.execute(
      `SELECT Disease_code AS id, Disease_type AS name
       FROM diseases
       ORDER BY Disease_type ASC`
    );
    diseases = diseaseRows;

    if (email) {
      const [rows] = await pool.execute(
        `SELECT Email_member, First_name, Image, Disease_tags
         FROM members
         WHERE Email_member = ?
         LIMIT 1`,
        [email]
      );
      if (rows.length > 0) user = mapMember(rows[0]);
      else reason = 'อีเมลนี้ไม่มีในระบบ';
    } else {
      // ถ้าไม่ส่ง email มา จะพยายามดึงรายแรก (กันหน้าเปล่า)
      const [rows] = await pool.execute(
        `SELECT Email_member, First_name, Image, Disease_tags
         FROM members
         ORDER BY Email_member ASC
         LIMIT 1`
      );
      if (rows.length > 0) user = mapMember(rows[0]);
      else reason = 'ไม่มีข้อมูลในตาราง members';
    }
  } catch (e) {
    console.error('DB error:', e);
    reason = 'DB error';
  }

  return { props: { user, diseases, reason } };
}
