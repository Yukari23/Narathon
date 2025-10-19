'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { FaUser, FaEnvelope, FaLock, FaImage, FaArrowLeft, FaPlus, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';
import styles from '../styles/AdminRegister.module.css';

export default function AdminRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // สร้าง preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    // ตรวจสอบข้อมูล
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
      setMessageType('error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('รหัสผ่านไม่ตรงกัน');
      setMessageType('error');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('password', formData.password);
      if (image) {
        formDataToSend.append('image', image);
      }

      const response = await fetch('/api/admin-register', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setMessageType('success');
        // รีเซ็ตฟอร์ม
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setImage(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage(data.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error registering admin:', error);
      setMessage('เกิดข้อผิดพลาดในการเพิ่มแอดมิน');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/AdminDashboard" className={styles.backLink}>
          <FaArrowLeft /> กลับแดชบอร์ด
        </Link>
        <h1 className={styles.pageTitle}>เพิ่มแอดมินใหม่</h1>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <div className={styles.iconContainer}>
            <FaUser />
          </div>
          <h2>ข้อมูลแอดมินใหม่</h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              <FaUser /> ชื่อแอดมิน
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="กรอกชื่อแอดมิน"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              <FaEnvelope /> อีเมล
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="กรอกอีเมล"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              <FaLock /> รหัสผ่าน
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              <FaLock /> ยืนยันรหัสผ่าน
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="ยืนยันรหัสผ่าน"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="image" className={styles.label}>
              <FaImage /> รูปโปรไฟล์ (ไม่บังคับ)
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
              ref={fileInputRef}
            />
            {preview && (
              <div className={styles.imagePreview}>
                <img src={preview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className={styles.removeImage}
                >
                  ลบรูป
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? (
              <>
                <FaSpinner className={styles.spinner} />
                กำลังเพิ่มแอดมิน...
              </>
            ) : (
              <>
                <FaPlus />
                เพิ่มแอดมิน
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
