'use client';
import { useRef, useState } from 'react';
import styles from '../styles/Login/ForgotPassword.module.css';
import Link from 'next/link';
import { FaPaperPlane, FaRedo, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');            // เริ่มเป็นค่าว่างเสมอ
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const RESEND_COOLDOWN = 60;
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const sendOTP = async () => {
    const e = email.trim().toLowerCase();
    if (!e) { setIsError(true); setMessage('กรุณากรอกอีเมล'); return; }
    if (!emailValid(e)) { setIsError(true); setMessage('กรุณากรอกอีเมลให้ถูกต้อง'); return; }

    setIsError(false); setMessage(''); setIsLoading(true);

    try {
      // เก็บเฉพาะอีเมลที่จะใช้ใน flow reset
      localStorage.setItem('resetEmail', e);

      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e })
      });

      let data = {};
      const text = await res.text();
      try { data = JSON.parse(text); } catch { data = { message: text || '' }; }

      if (res.ok) {
        const msg = (data && data.message) || 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว';
        setIsError(false); setMessage(msg);
        // ไปหน้า OTP ทันที
        setTimeout(() => { window.location.href = '/OTP'; }, 600);
      } else {
        setIsError(true); setMessage(data.message || 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch (err) {
      console.error('forgot-password error:', err);
      setIsError(true); setMessage('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (e) => { e.preventDefault(); await sendOTP(); };
  const onResend = async () => { if (!isLoading && cooldown === 0) await sendOTP(); };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.formHeader}>
          <h2 className={styles.title}>ลืมรหัสผ่านทางอีเมล</h2>
          <p className={styles.subtitle}>กรอกอีเมลเพื่อรับรหัส OTP สำหรับตั้งรหัสผ่านใหม่</p>
        </div>

        {/* ปิด autofill ทั้งฟอร์ม */}
        <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
          <div className={styles.inputGroup}>
            <input
              type="email"
              // ใช้ name แปลก ๆ เพื่อตัดการเดา autofill ของเบราว์เซอร์
              name="fp_email_field"
              inputMode="email"
              autoCorrect="off"
              autoCapitalize="none"
              autoComplete="off"
              placeholder="กรอกอีเมลของคุณ"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              disabled={isLoading}
              required
            />
          </div>

          {message && (
            <p className={`${styles.message} ${isError ? styles.error : styles.success}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            className={`${styles.button} ${isLoading ? styles.loading : ''}`}
            disabled={isLoading}
          >
            <FaPaperPlane />
            {isLoading ? 'กำลังส่งอีเมล...' : 'ส่งรหัสยืนยันไปอีเมล'}
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onResend}
            disabled={isLoading || cooldown > 0}
            title={cooldown > 0 ? `ขอส่งใหม่ได้ใน ${cooldown} วินาที` : 'ส่งรหัสอีกครั้ง'}
          >
            <FaRedo />
            {cooldown > 0 ? `ส่งใหม่ได้ใน ${cooldown}s` : 'ส่งรหัสอีกครั้ง'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/Login" className={styles.link}>
            <FaArrowLeft style={{ marginRight: 6 }} />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
          {/* เอาลิงก์ไป Reset ออก — ตอนนี้เราพาไป /OTP อัตโนมัติแล้ว */}
        </div>
      </div>
    </div>
  );
}
