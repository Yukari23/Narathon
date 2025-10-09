'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AdminDashboard.module.css';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

export default function AdminDiseases() {
  const router = useRouter();
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#94a3b8' });

  useEffect(() => {
    // ตรวจสอบสิทธิ์แอดมิน
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login');
      return;
    }

    loadDiseases();
  }, [router]);

  const loadDiseases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-diseases');
      const data = await response.json();
      
      if (response.ok) {
        setDiseases(data.diseases || []);
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลโรค');
      }
    } catch (error) {
      console.error('Error loading diseases:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingId ? '/api/admin-diseases' : '/api/admin-diseases';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(editingId && { id: editingId })
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'บันทึกข้อมูลสำเร็จ');
        setFormData({ name: '', color: '#94a3b8' });
        setShowAddForm(false);
        setEditingId(null);
        loadDiseases();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error saving disease:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleEdit = (disease) => {
    setFormData({ name: disease.name, color: disease.color || '#94a3b8' });
    setEditingId(disease.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโรคนี้?')) return;

    try {
      const response = await fetch(`/api/admin-diseases?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'ลบโรคสำเร็จ');
        loadDiseases();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการลบโรค');
      }
    } catch (error) {
      console.error('Error deleting disease:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const cancelEdit = () => {
    setFormData({ name: '', color: '#94a3b8' });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => router.push('/AdminDashboard')}
              className={styles.logoutBtn}
              style={{ background: 'var(--primary-500)' }}
            >
              <FaArrowLeft /> กลับ
            </button>
            <h1>จัดการโรค</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'white', margin: 0 }}>รายการโรคทั้งหมด</h2>
          <button 
            onClick={() => setShowAddForm(true)}
            className={styles.submitButton}
            style={{ margin: 0, padding: '0.75rem 1.5rem' }}
          >
            <FaPlus /> เพิ่มโรคใหม่
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className={styles.statCard} style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {editingId ? 'แก้ไขโรค' : 'เพิ่มโรคใหม่'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  ชื่อโรค
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <button type="submit" className={styles.submitButton} style={{ margin: 0, flex: 1 }}>
                  <FaSave /> {editingId ? 'อัปเดต' : 'เพิ่ม'}
                </button>
                <button type="button" onClick={cancelEdit} className={styles.logoutBtn} style={{ flex: 1 }}>
                  <FaTimes /> ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Diseases List */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {diseases.map((disease) => (
            <div key={disease.id} className={styles.statCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                    {disease.name}
                  </h4>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
                    ID: {disease.id}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleEdit(disease)}
                    className={styles.submitButton}
                    style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <FaEdit /> แก้ไข
                  </button>
                  <button 
                    onClick={() => handleDelete(disease.id)}
                    className={styles.logoutBtn}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <FaTrash /> ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {diseases.length === 0 && (
          <div className={styles.statCard} style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              ยังไม่มีโรคในระบบ
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
