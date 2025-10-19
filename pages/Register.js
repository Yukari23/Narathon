'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash, FaUserPlus, FaImage, FaTimes } from 'react-icons/fa'
import styles from '../styles/Login/Register.module.css'

const fields = [
  { name: 'name', type: 'text', placeholder: 'กรอกชื่อของคุณ', icon: <FaUser /> },
  { name: 'email', type: 'email', placeholder: 'กรอกอีเมลของคุณ', icon: <FaEnvelope /> },
]

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [show, setShow] = useState({ password: false, confirmPassword: false })
  const [popupMessage, setPopupMessage] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      
      // สร้าง preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (loading) return

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password
    const confirmPassword = form.confirmPassword

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) return showMsg('❌ กรุณากรอกอีเมลให้ถูกต้อง')
    if (password.length < 6) return showMsg('❌ รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร')
    if (password !== confirmPassword) return showMsg('❌ รหัสผ่านไม่ตรงกัน')

    setLoading(true)
    try {
      // ใช้ FormData สำหรับการอัปโหลดรูปภาพ
      const formData = new FormData()
      formData.append('name', name)
      formData.append('email', email)
      formData.append('password', password)
      if (image) {
        formData.append('image', image)
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409) return showMsg('⚠️ อีเมลนี้ถูกใช้งานแล้ว')
        return showMsg(`❌ สมัครสมาชิกล้มเหลว: ${data.message || 'ไม่ทราบสาเหตุ'}`)
      }

      // ถ้า API ส่ง token มา → ล็อกอินทันที
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userRole', 'user')
        localStorage.setItem('memberEmail', email)
        router.push('/')
        return
      }

      // ไม่ได้ส่ง token → เด้งไปหน้า Login
      showMsg('✅ สมัครสมาชิกสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...')
      setTimeout(() => router.push('/Login'), 1500)
    } catch (err) {
      console.error('Registration error:', err)
      showMsg('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  function showMsg(msg) {
    setPopupMessage(msg)
    setShowPopup(true)
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.iconHeader}>
          <FaUserPlus size={60} color="#3b82f6" />
        </div>
        <h2 className={styles.title}>สมัครสมาชิก</h2>
        <p className={styles.subtitle}>กรอกข้อมูลของคุณเพื่อเริ่มต้นใช้งาน</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {fields.map(f => (
            <div className={styles.inputWrapper} key={f.name}>
              <span className={styles.inputIcon}>{f.icon}</span>
              <input
                name={f.name}
                type={f.type}
                className={styles.input}
                placeholder={f.placeholder}
                value={form[f.name]}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          ))}

          {[{ name: 'password', label: 'กรอกรหัสผ่านของคุณ' }, { name: 'confirmPassword', label: 'ยืนยันรหัสผ่านของคุณ' }].map(f => (
            <div className={styles.passwordWrapper} key={f.name}>
              <FaLock className={styles.inputIcon} />
              <input
                name={f.name}
                type={show[f.name] ? 'text' : 'password'}
                className={styles.input}
                placeholder={f.label}
                value={form[f.name]}
                onChange={handleChange}
                disabled={loading}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShow(s => ({ ...s, [f.name]: !s[f.name] }))}
                className={styles.eyeIcon}
                tabIndex={-1}
                aria-label="toggle-password"
              >
                {show[f.name] ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          ))}

          {/* รูปโปรไฟล์ */}
          <div className={styles.imageUploadWrapper}>
            <label htmlFor="profileImage" className={styles.imageUploadLabel}>
              <FaImage className={styles.inputIcon} />
              <span>รูปโปรไฟล์ (ไม่บังคับ)</span>
            </label>
            <input
              type="file"
              id="profileImage"
              name="profileImage"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
              ref={fileInputRef}
              disabled={loading}
            />
            {preview && (
              <div className={styles.imagePreview}>
                <img src={preview} alt="Preview" />
                <button
                  type="button"
                  onClick={removeImage}
                  className={styles.removeImageBtn}
                  disabled={loading}
                >
                  <FaTimes />
                </button>
              </div>
            )}
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            <FaUserPlus className={styles.buttonIcon} />
            <span>{loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}</span>
          </button>
        </form>

        <div className={styles.footer}>
          <p>มีบัญชีอยู่แล้ว? <Link href="/Login">เข้าสู่ระบบ</Link></p>
        </div>
      </div>

      {showPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowPopup(false)}>
          <div className={styles.popup} role="alert" aria-live="polite">
            <p>{popupMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}
