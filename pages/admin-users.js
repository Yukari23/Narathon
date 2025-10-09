'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AdminDashboard.module.css';
import { FaArrowLeft, FaEdit, FaTrash, FaUser, FaEnvelope, FaSearch } from 'react-icons/fa';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // ตรวจสอบสิทธิ์แอดมิน
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login');
      return;
    }

    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      isActive: user.otp !== 'DISABLED'
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      const response = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: updatedUser.email,
          name: updatedUser.name,
          diseaseTags: updatedUser.diseaseTags,
          comment: updatedUser.comment,
          isActive: updatedUser.isActive
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'อัปเดตข้อมูลผู้ใช้สำเร็จ');
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleDeleteUser = async (email) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้จะลบข้อมูลทั้งหมดที่เกี่ยวข้อง')) return;

    try {
      const response = await fetch(`/api/admin-users?email=${email}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'ลบผู้ใช้สำเร็จ');
        loadUsers();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1>จัดการผู้ใช้</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'white', margin: 0 }}>รายการผู้ใช้ทั้งหมด ({users.length} คน)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ 
                position: 'absolute', 
                left: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: '2px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '1rem',
                  width: '300px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Users List */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredUsers.map((user) => (
            <div key={user.email} className={styles.statCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'var(--primary-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-600)',
                    fontSize: '1.5rem'
                  }}>
                    <FaUser />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                      {user.name || 'ไม่ระบุชื่อ'}
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaEnvelope size={12} />
                      {user.email}
                    </p>
                    {user.diseaseTags && user.diseaseTags.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {user.diseaseTags.map((tag, index) => (
                          <span 
                            key={index}
                            style={{
                              background: 'var(--primary-100)',
                              color: 'var(--primary-700)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        background: user.otp === 'DISABLED' ? 'var(--error-100)' : 'var(--success-100)',
                        color: user.otp === 'DISABLED' ? 'var(--error-700)' : 'var(--success-700)'
                      }}>
                        {user.otp === 'DISABLED' ? 'ปิดใช้งาน' : 'ใช้งานปกติ'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleEditUser(user)}
                    className={styles.submitButton}
                    style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <FaEdit /> แก้ไข
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.email)}
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

        {filteredUsers.length === 0 && (
          <div className={styles.statCard} style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              {searchTerm ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ยังไม่มีผู้ใช้ในระบบ'}
            </p>
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className={styles.statCard} style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
              แก้ไขข้อมูลผู้ใช้
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUser(editingUser);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  ชื่อ
                </label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  อีเมล
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '1rem',
                    background: 'var(--background-secondary)',
                    color: 'var(--text-secondary)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  โรคที่สนใจ (คั่นด้วยจุลภาค)
                </label>
                <input
                  type="text"
                  value={editingUser.diseaseTags ? editingUser.diseaseTags.join(', ') : ''}
                  onChange={(e) => setEditingUser({ 
                    ...editingUser, 
                    diseaseTags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  หมายเหตุ
                </label>
                <textarea
                  value={editingUser.comment || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, comment: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  />
                  เปิดใช้งานบัญชี
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className={styles.submitButton} style={{ margin: 0, flex: 1 }}>
                  บันทึก
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }} 
                  className={styles.logoutBtn} 
                  style={{ flex: 1 }}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
