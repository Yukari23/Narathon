// /pages/AdminProfile.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/Profile/ProfileSettings.module.css';
import { FaUser, FaCamera, FaSave, FaSpinner, FaArrowLeft, FaLock } from 'react-icons/fa';

function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}

export default function AdminProfile() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [imageURL, setImageURL] = useState('/images/GF3.jpg');
  const [imageFile, setImageFile] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success | error | ''

  useEffect(() => {
    // ตรวจสอบ role แบบง่าย ๆ
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') {
      setMessage('ต้องเป็นแอดมินเท่านั้น');
      setMessageType('error');
      setInitialLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/admin');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || 'โหลดข้อมูลแอดมินไม่สำเร็จ');
        }
        setEmail(data.admin?.email || '');
        setName(data.admin?.name || '');
        setImageURL(normalizeImagePath(data.admin?.image));
      } catch (err) {
        console.error(err);
        setMessage(err.message || 'โหลดข้อมูลแอดมินไม่สำเร็จ');
        setMessageType('error');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

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
    setImageURL(url);
    setImageFile(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(''); setMessageType('');

    try {
      if (!email) throw new Error('ไม่พบอีเมลแอดมิน');

      const form = new FormData();
      form.append('email', email);
      if (name) form.append('name', name);
      if (newPassword) form.append('newPassword', newPassword);
      if (imageFile) form.append('image', imageFile);

      setUploading(!!imageFile);

      const res = await fetch('/api/admin', {
        method: 'PUT',
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'อัปเดตไม่สำเร็จ');
      }

      setName(data.admin?.name || name);
      setImageURL(normalizeImagePath(data.admin?.image || imageURL));
      setNewPassword('');
      setImageFile(null);

      setMessage('บันทึกข้อมูลแอดมินเรียบร้อยแล้ว');
      setMessageType('success');
    } catch (err) {
      console.error('Update admin error:', err);
      setMessage(err.message || 'เกิดข้อผิดพลาด');
      setMessageType('error');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <FaArrowLeft /> กลับหน้าหลัก
        </Link>
        <h1 className={styles.title}>⚙️ ตั้งค่าโปรไฟล์แอดมิน</h1>
      </div>

      <div className={styles.card}>
        {/* Email (อ่านอย่างเดียว) */}
        <div className={styles.section}>
          <label>อีเมลแอดมิน</label>
          <input className={styles.input} value={email} disabled />
        </div>

        {/* รูปโปรไฟล์ */}
        <div className={styles.imageSection}>
          <img src={normalizeImagePath(imageURL)} alt="Admin" className={styles.image} />
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

        {/* ชื่อ */}
        <div className={styles.section}>
          <label><FaUser /> ชื่อ</label>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ชื่อแอดมิน"
          />
        </div>

        {/* เปลี่ยนรหัสผ่าน (ทางเลือก) */}
        <div className={styles.section}>
          <label><FaLock /> รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)</label>
          <input
            className={styles.input}
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="ใส่รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
            minLength={6}
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
