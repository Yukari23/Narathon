'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login/Otp.module.css';
import Link from 'next/link';
import { FaRedo, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

const RESEND_COOLDOWN = 60;

export default function OTPPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const e =
      localStorage.getItem('resetEmail') ||
      localStorage.getItem('memberEmail') ||
      localStorage.getItem('userEmail') ||
      '';
    if (!e) {
      router.replace('/Forgot');
      return;
    }
    setEmail(e.trim().toLowerCase());
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [router]);

  const onChangeDigit = (idx, val) => {
    const v = String(val).replace(/\D/g, '').slice(0, 1);
    const next = [...otpDigits];
    next[idx] = v;
    setOtpDigits(next);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const onKeyDownDigit = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const onPasteOTP = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    const next = paste.split('');
    while (next.length < 6) next.push('');
    setOtpDigits(next);
    const last = Math.min(paste.length, 6) - 1;
    if (last >= 0) inputsRef.current[last]?.focus();
  };

  const getOTP = () => otpDigits.join('');

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const resendOTP = async () => {
    if (!email) {
      setIsError(true);
      setMessage('ไม่พบบัญชีอีเมล กรุณากรอกอีเมลใหม่');
      router.replace('/Forgot');
      return;
    }
    if (cooldown > 0 || isLoading) return;

    setIsLoading(true);
    setIsError(false);
    setMessage('');
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว');
        setIsError(false);
        startCooldown();
      } else {
        setMessage(data.message || 'ไม่สามารถส่งรหัส OTP ได้');
        setIsError(true);
      }
    } catch (err) {
      console.error('resendOTP error:', err);
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setIsError(false);
    setMessage('');

    if (!email) {
      setIsError(true);
      setMessage('ไม่พบบัญชีอีเมล กรุณากรอกอีเมลใหม่');
      router.replace('/Forgot');
      return;
    }
    const otp = getOTP();
    if (otp.length !== 6) {
      setIsError(true);
      setMessage('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('otpOk', otp);
        localStorage.setItem('resetEmail', email);
        setMessage('ยืนยันรหัส OTP สำเร็จ กำลังไปหน้าตั้งรหัสผ่านใหม่...');
        setIsError(false);
        setTimeout(() => router.push('/ResetPassword'), 800);
      } else {
        setIsError(true);
        setMessage(data.message || 'รหัส OTP ไม่ถูกต้อง');
      }
    } catch (error) {
      setIsError(true);
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.formHeader}>
          <div className={styles.iconHeader}>
            <FaCheckCircle size={60} color="var(--primary-500)" />
          </div>
          <h2 className={styles.title}>ยืนยันรหัส OTP</h2>
          <p className={styles.subtitle}>กรอกรหัส OTP 6 หลักที่ได้รับ</p>
        </div>

        <form onSubmit={submit} className={styles.form}>
          <div className={`${styles.inputGroup} ${styles.otpGrid}`}>
            <label className={styles.otpLabel}>รหัส OTP</label>
            <div onPaste={onPasteOTP} className={styles.otpRow}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onChangeDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDownDigit(i, e)}
                  className={`${styles.input} ${styles.otpInput}`}
                />
              ))}
            </div>
            <small className={styles.otpHint}>
              วาง (Paste) รหัสที่คัดลอกมาจากอีเมลได้ทันที
            </small>
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
            ยืนยัน OTP
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={resendOTP}
            disabled={isLoading || cooldown > 0}
            title={cooldown > 0 ? `ขอส่งใหม่ได้ใน ${cooldown} วินาที` : 'ส่งรหัสอีกครั้ง'}
          >
            <FaRedo />
            {cooldown > 0 ? `ส่งใหม่ได้ใน ${cooldown}s` : 'ส่งรหัสอีกครั้ง'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/Forgot" className={styles.link}>
            <FaArrowLeft style={{ marginRight: 6 }} />
            กลับไปหน้าลืมรหัสผ่าน
          </Link>
        </div>
      </div>
    </div>
  );
}
