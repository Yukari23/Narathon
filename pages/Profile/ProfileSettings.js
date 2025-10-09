// /pages/Profile/ProfileSettings.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../styles/Profile/ProfileSettings.module.css';
import { FaUser, FaCamera, FaSave, FaSpinner, FaArrowLeft } from 'react-icons/fa';

function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}

export default function ProfileSettings() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [imageURL, setImageURL] = useState('/images/GF3.jpg'); // พรีวิว/URL ใช้งานจริง

  const [imageFile, setImageFile] = useState(null); // ไฟล์ใหม่ถ้ามี
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error' | ''

  // ---------- โหลดข้อมูลผู้ใช้ตามอีเมลที่ล็อกอิน ----------
  useEffect(() => {
    const e =
      localStorage.getItem('userEmail') ||
      localStorage.getItem('memberEmail') ||
      '';

    const eLc = (e || '').toLowerCase();
    setEmail(eLc);

    if (!eLc) {
      setMessage('ยังไม่พบอีเมลผู้ใช้งาน กรุณาเข้าสู่ระบบก่อน');
      setMessageType('error');
      setInitialLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/members?email=${encodeURIComponent(eLc)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        }

        const me = data.member; // API คืน { member: {...} }
        setName(me?.name || '');
        const img = normalizeImagePath(me?.image);
        setImageURL(img);

        // ซิงก์ลง localStorage เผื่อหน้าอื่นใช้
        localStorage.setItem('userName', me?.name || '');
        localStorage.setItem('userImage', me?.image || '');
        localStorage.setItem('memberImage', me?.image || '');
      } catch (err) {
        console.error(err);
        setMessage(err.message || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        setMessageType('error');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // ---------- เปลี่ยนรูป (พรีวิว + เก็บไฟล์ไว้) ----------
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('ไฟล์ต้องเป็นรูปภาพเท่านั้น'); setMessageType('error'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('ขนาดรูปต้องไม่เกิน 5MB'); setMessageType('error'); return;
    }

    const url = URL.createObjectURL(file);
    setImageURL(url);        // พรีวิวทันที
    setImageFile(file);      // เก็บไฟล์ไว้เพื่ออัปโหลดจริงตอนกดบันทึก
  };

  // ---------- บันทึก ----------
  const handleSave = async () => {
    setSaving(true);
    setMessage(''); setMessageType('');

    try {
      if (!email) throw new Error('ไม่พบอีเมลผู้ใช้');

      let finalImageUrl = imageURL;

      // 1) ถ้ามีไฟล์ใหม่ → อัปโหลดจริงไป /api/upload-profile-image
      if (imageFile) {
        setUploading(true);
        const form = new FormData();
        form.append('image', imageFile);
        const up = await fetch('/api/upload-profile-image', { method: 'POST', body: form });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData?.message || 'อัปโหลดรูปไม่สำเร็จ');
        finalImageUrl = upData.url; // => /uploads/xxx.jpg
        setUploading(false);
      }

      // 2) PUT ไปอัปเดต members
      const token = localStorage.getItem('token') || '';
      const payload = { email, name, image: finalImageUrl };
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }

      // 3) Sync state + localStorage
      const me = data.member;
      setName(me?.name || name);
      setImageURL(normalizeImagePath(me?.image || finalImageUrl));
      localStorage.setItem('userName', me?.name || name);
      localStorage.setItem('userImage', me?.image || finalImageUrl);
      localStorage.setItem('memberImage', me?.image || finalImageUrl);

      setMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      setMessageType('success');
      setImageFile(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setMessageType('error');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link
            href={email ? `/Profile/UserProfile?email=${encodeURIComponent(email)}` : '/Profile/UserProfile'}
            className={styles.backLink}
          >
            <FaArrowLeft /> กลับหน้าโปรไฟล์
          </Link>
          <h1 className={styles.title}>⚙️ ตั้งค่าโปรไฟล์</h1>
        </div>
        <div className={styles.card}>
          <p><FaSpinner className={styles.spinner} /> กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link
          href={email ? `/Profile/UserProfile?email=${encodeURIComponent(email)}` : '/Profile/UserProfile'}
          className={styles.backLink}
        >
          <FaArrowLeft /> กลับหน้าโปรไฟล์
        </Link>
        <h1 className={styles.title}>⚙️ ตั้งค่าโปรไฟล์</h1>
      </div>

      <div className={styles.card}>
        {/* SECTION 1: ข้อมูลส่วนตัว */}
        <h2 className={styles.sectionTitle}>
          <FaUser /> ข้อมูลส่วนตัว
        </h2>

        <div className={styles.section}>
          <label>อีเมลที่ล็อกอิน</label>
          <input className={styles.input} value={email} disabled />
        </div>

        <div className={styles.imageSection}>
          <img src={normalizeImagePath(imageURL)} alt="Profile" className={styles.image} />
          <label className={styles.fileInputLabel}>
            <FaCamera /> เปลี่ยนรูปโปรไฟล์
            <input
              type="file"
              onChange={handleImageChange}
              className={styles.fileInput}
              accept="image/*"
            />
          </label>
        </div>

        <div className={styles.section}>
          <label><FaUser /> ชื่อ</label>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="กรอกชื่อของคุณ"
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        <button
          className={styles.button}
          onClick={handleSave}
          disabled={saving || uploading}
        >
          {saving || uploading ? (
            <>
              <FaSpinner className={styles.spinner} /> กำลังบันทึก...
            </>
          ) : (
            <>
              <FaSave /> บันทึกการตั้งค่า
            </>
          )}
        </button>
      </div>
    </div>
  );
}
