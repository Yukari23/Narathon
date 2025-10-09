'use client'
import { useState } from 'react'
import styles from '../styles/Login/Login.module.css'
import Link from 'next/link'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt } from 'react-icons/fa'
import { MdAccountCircle } from 'react-icons/md'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(`เข้าสู่ระบบสำเร็จ: ${data.user.email}`)

        localStorage.setItem('token', data.token) // ✅ [เพิ่ม] เก็บ Token
        localStorage.setItem('userEmail', data.user.email)
        localStorage.setItem('userRole', data.user.role)

        // ✅ Redirect ตาม role
        if (data.user.role === 'admin') {
          window.location.href = '/AdminDashboard'
        } else {
          window.location.href = '/'
        }
      } else {
        alert(`เข้าสู่ระบบล้มเหลว: ${data.message}`)
      }
    } catch (err) {
      console.error('Login error:', err)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.backgroundPattern}></div>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.iconHeader}>
            <MdAccountCircle className={styles.icon} />
          </div>
          <h1 className={styles.title}>ยินดีต้อนรับ</h1>
          <p className={styles.subtitle}>เข้าสู่ระบบเพื่อค้นหาสูตรอาหารเพื่อสุขภาพ</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputWrapper}>
            <FaEnvelope className={styles.inputIcon} />
            <input
              type="email"
              placeholder="กรอกอีเมลของคุณ"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.passwordWrapper}>
            <FaLock className={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="กรอกรหัสผ่านของคุณ"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.eyeIcon}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button type="submit" className={styles.button}>
            <FaSignInAlt className={styles.buttonIcon} />
            <span>เข้าสู่ระบบ</span>
          </button>
        </form>

        <div className={styles.footer}>
          <p>ยังไม่มีบัญชี? <Link href="/Register">สมัครสมาชิก</Link></p>
          <Link href="/Forgot">ลืมรหัสผ่าน</Link>
        </div>
      </div>
    </div>
  )
}
