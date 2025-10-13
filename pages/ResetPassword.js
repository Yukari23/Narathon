'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login/ForgotPassword.module.css';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

const MIN_LEN = 6;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otpOk, setOtpOk] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const e =
      localStorage.getItem('resetEmail') ||
      localStorage.getItem('memberEmail') ||
      localStorage.getItem('userEmail') ||
      '';
    const otp = sessionStorage.getItem('otpOk') || '';

    if (!otp || !e) {
      router.replace('/OTP');
      return;
    }
    setEmail(e.trim().toLowerCase());
    setOtpOk(otp);
  }, [router]);

  const strengthText = useMemo(() => {
    const p = newPassword || '';
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/\d/.test(p))    score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return 'ความแข็งแรง: ต่ำ';
    if (score === 3) return 'ความแข็งแรง: ปานกลาง';
    if (score >= 4) return 'ความแข็งแรง: สูง';
    return '';
  }, [newPassword]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (!otpOk || otpOk.length !== 6 || !email) {
      router.replace('/OTP');
      return;
    }
    if (newPassword.length < MIN_LEN) {
      setErr(`รหัสผ่านต้องอย่างน้อย ${MIN_LEN} ตัวอักษร`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpOk, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('ตั้งรหัสผ่านใหม่สำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...');
        sessionStorage.removeItem('otpOk');
        setTimeout(() => router.push('/Login'), 1200);
      } else {
        setErr(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setErr('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.formHeader}>
          <div className={styles.iconHeader}>
            <FaCheckCircle size={60} color="var(--primary-500)" />
          </div>
          <h2 className={styles.title}>ตั้งรหัสผ่านใหม่</h2>
          <p className={styles.subtitle}>กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
        </div>

        <form onSubmit={submit} className={styles.form}>
          {/* ช่องรหัสผ่านใหม่ (ไอคอนตาอยู่ซ้าย) */}
          <div className={styles.inputGroup}>
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className={styles.eyeLeftIcon}
              aria-label="toggle-password"
              disabled={loading}
            >
             
            </button>
            <input
              type={showPw ? 'text' : 'password'}
              name="newPassword"
              placeholder="รหัสผ่านใหม่"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${styles.input} ${styles.inputWithLeftIcon}`}
              disabled={loading}
              required
              minLength={MIN_LEN}
            />
          </div>

          {newPassword && (
            <p className={styles.subtitle} style={{ marginTop: -8, marginBottom: 8 }}>
              {strengthText}
            </p>
          )}

          {/* ช่องยืนยันรหัสผ่านใหม่ (ไอคอนตาอยู่ซ้าย) */}
          <div className={styles.inputGroup}>
            <button
              type="button"
              onClick={() => setShowPw2(!showPw2)}
              className={styles.eyeLeftIcon}
              aria-label="toggle-confirm-password"
              disabled={loading}
            >
            
            </button>
            <input
              type={showPw2 ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${styles.input} ${styles.inputWithLeftIcon}`}
              disabled={loading}
              required
              minLength={MIN_LEN}
            />
          </div>

          {/* ข้อความสถานะ */}
          {msg && <p className={`${styles.message} ${styles.success}`}>{msg}</p>}
          {err && <p className={`${styles.message} ${styles.error}`}>{err}</p>}

          <button
            type="submit"
            className={`${styles.button} ${loading ? styles.loading : ''}`}
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ...' : 'ตั้งรหัสผ่านใหม่'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/OTP" className={styles.link}>
            <FaArrowLeft style={{ marginRight: 6 }} />
            กลับไปหน้า OTP
          </Link>
          <Link href="/Login" className={styles.link}>
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
