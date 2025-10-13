// /pages/Admin/Profile.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/Profile/UserProfile.module.css'; // ใช้ CSS เดียวกันได้
import { FaArrowLeft, FaEdit, FaUser } from 'react-icons/fa';

function getAdminEmail() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('adminEmail') ||
    localStorage.getItem('userEmail') || // กันกรณีเก็บ key เดิม
    ''
  );
}

export default function AdminProfilePage() {
  const router = useRouter();
  const email = useMemo(() => getAdminEmail(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [profile, setProfile] = useState({
    role: 'admin',
    name: '',
    email: '',
    image: '/images/default-avatar.png'
  });

  useEffect(() => {
    if (!email) {
      setErr('กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อน');
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/admin/profile?email=${encodeURIComponent(email)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const data = await res.json();
        setProfile(data.profile);
      } catch (e) {
        console.error(e);
        setErr('ไม่สามารถโหลดข้อมูลโปรไฟล์แอดมินได้');
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [email]);

  if (loading) return <div className={styles.container}><div className={styles.loading}>กำลังโหลดโปรไฟล์...</div></div>;
  if (err) return (
    <div className={styles.container}>
      <div className={styles.notice}>{err}</div>
      <button className={styles.backBtn} onClick={() => router.push('/')}>
        <FaArrowLeft /> กลับหน้าแรก
      </button>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <FaArrowLeft /> กลับ
        </button>
        <h1 className={styles.title}>โปรไฟล์ผู้ดูแลระบบ</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.avatarWrap}>
          <Image src={profile.image || '/images/default-avatar.png'} alt="admin-avatar" width={140} height={140} className={styles.avatar} />
        </div>

        <div className={styles.info}>
          <div className={styles.row}>
            <span className={styles.label}><FaUser /> ชื่อ</span>
            <span className={styles.value}>{profile.name || '-'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>อีเมล</span>
            <span className={styles.value}>{profile.email || '-'}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/Admin/EditProfile" className={styles.editBtn}>
            <FaEdit /> แก้ไขโปรไฟล์
          </Link>
        </div>
      </div>
    </div>
  );
}
