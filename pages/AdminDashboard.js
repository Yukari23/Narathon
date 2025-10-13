import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import styles from '../styles/AdminDashboard.module.css'
import { 
  FaUsers, 
  FaUtensils, 
  FaBookmark, 
  FaComments, 
  FaTrash, 
  FaEdit, 
  FaEye,
  FaSearch,
  FaFilter,
  FaChartBar,
  FaUserCog,
  FaSignOutAlt,
  FaPlus,
  FaSave,
  FaTimes,
  FaUser,
  FaEnvelope,
  FaHome
} from 'react-icons/fa'

export default function AdminDashboard() {
  const router = useRouter()
  const [adminInfo, setAdminInfo] = useState(null)

  // ✅ เก็บสถิติรวมจาก /api/admin-stats (รวม diseaseStats จากหน้าโปรไฟล์)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecipes: 0,
    totalBookmarks: 0,
    totalComments: 0,
    growthRates: null,
    recent: { users: [], recipes: [], comments: [] },
    diseaseStatsFromProfiles: [],   // ✅ ใหม่
    diseaseSource: ''               // ✅ ใหม่
  })

  // สถิติ/ข้อมูลเดิมที่คำนวณจาก recipes ตรง ๆ (คงไว้)
  const [diseaseStats, setDiseaseStats] = useState([])
  const [mealStats, setMealStats] = useState([])

  const [users, setUsers] = useState([])
  const [recipes, setRecipes] = useState([])
  const [diseases, setDiseases] = useState([])

  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDiseaseForm, setShowDiseaseForm] = useState(false)
  const [editingDisease, setEditingDisease] = useState(null)
  const [diseaseFormData, setDiseaseFormData] = useState({ name: '', color: '#94a3b8' })
  const [editingUser, setEditingUser] = useState(null)
  const [showUserEditModal, setShowUserEditModal] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      router.push('/Login')
      return
    }

    fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.valid) {
          router.push('/Login')
        } else {
          loadAdminData()
        }
      })
      .catch(error => {
        console.error('Verify error:', error)
        router.push('/Login')
      })
  }, [router])

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // โหลดข้อมูลหลัก
      const [adminRes, statsRes, usersRes, recipesRes, diseasesRes] = await Promise.all([
        fetch('/api/admin'),
        fetch('/api/admin-stats'),
        fetch('/api/admin-users'),
        fetch('/api/recipes'),
        fetch('/api/admin-diseases')
      ])
      
      const adminData = await adminRes.json()
      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      const recipesData = await recipesRes.json()
      const diseasesData = await diseasesRes.json()
      
      setAdminInfo(adminData.admin)
      setUsers(usersData.users || [])
      setRecipes(recipesData.recipes || [])
      setDiseases(diseasesData.diseases || [])

      // คำนวณสถิติจาก recipes ภายในเครื่อง (คงไว้ตามเดิม)
      calculateDiseaseStats(recipesData.recipes || [], diseasesData.diseases || [])
      calculateMealStats(recipesData.recipes || [])

      // ✅ ใช้สถิติรวมจาก /api/admin-stats (รวม diseaseStats จาก "หน้าโปรไฟล์")
      if (statsData.stats) {
        setStats({
          totalUsers: statsData.stats.totalUsers,
          totalRecipes: statsData.stats.totalRecipes,
          totalBookmarks: statsData.stats.totalBookmarks,
          totalComments: statsData.stats.totalComments,
          growthRates: statsData.stats.growthRates,
          recent: statsData.stats.recent,
          diseaseStatsFromProfiles: statsData.stats.diseaseStats || [], // ✅ ใช้ค่านี้
          diseaseSource: statsData.stats.diseaseSource || ''            // ✅ source
        })
      } else {
        // Fallback
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.users?.length || 0,
          totalRecipes: recipesData.recipes?.length || 0,
          totalBookmarks: 0,
          totalComments: 0,
          diseaseStatsFromProfiles: [],
          diseaseSource: ''
        }))
      }
      
    } catch (error) {
      console.error('Error loading admin data:', error)
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ====== Utilities / Calculations ======
  const calculateDiseaseStats = (recipes, diseases) => {
    const diseaseCount = {}
    recipes.forEach(recipe => {
      if (recipe.Disease_code) {
        const diseaseId = recipe.Disease_code
        diseaseCount[diseaseId] = (diseaseCount[diseaseId] || 0) + 1
      }
    })
    const diseaseStats = diseases.map(d => ({
      id: d.id,
      name: d.name,
      count: diseaseCount[d.id] || 0
    })).sort((a, b) => b.count - a.count)
    setDiseaseStats(diseaseStats)
  }

  const getMealName = (mealValue) => {
    if (!mealValue) return null
    const mealMap = {
      '1': 'มื้อเช้า',
      '2': 'มื้อกลางวัน',
      '3': 'มื้อเย็น',
      'breakfast': 'มื้อเช้า',
      'lunch': 'มื้อกลางวัน',
      'dinner': 'มื้อเย็น'
    }
    return mealMap[mealValue] || null
  }

  const calculateMealStats = (recipes) => {
    const mealCount = {
      '1': { name: 'มื้อเช้า', count: 0 },
      '2': { name: 'มื้อกลางวัน', count: 0 },
      '3': { name: 'มื้อเย็น', count: 0 },
      'breakfast': { name: 'มื้อเช้า', count: 0 },
      'lunch': { name: 'มื้อกลางวัน', count: 0 },
      'dinner': { name: 'มื้อเย็น', count: 0 }
    }
    recipes.forEach(recipe => {
      let mealValue = recipe.Meal
      if (mealValue === null || mealValue === undefined) return
      if (typeof mealValue === 'number') mealValue = mealValue.toString()
      if (mealValue && mealCount[mealValue]) {
        mealCount[mealValue].count++
      }
    })
    const combinedMealCount = {
      '1': { name: 'มื้อเช้า', count: mealCount['1'].count + mealCount['breakfast'].count },
      '2': { name: 'มื้อกลางวัน', count: mealCount['2'].count + mealCount['lunch'].count },
      '3': { name: 'มื้อเย็น', count: mealCount['3'].count + mealCount['dinner'].count }
    }
    const mealStats = Object.entries(combinedMealCount).map(([id, data]) => ({
      id, name: data.name, count: data.count
    })).sort((a, b) => b.count - a.count)
    setMealStats(mealStats)
  }

  // ✅ ใช้ diseases state เพื่อแปลงชื่อโรค -> id CSV (กัน error ใน handleUpdateRecipe)
  const diseaseNamesToIdsCsv = (tagsStr) => {
    if (!tagsStr) return ''
    const names = String(tagsStr)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.toLowerCase())
    const matchedIds = diseases
      .filter(d => names.includes(String(d.name || '').toLowerCase()))
      .map(d => d.id)
    return matchedIds.join(',')
  }

  // ====== Actions ======
  const handleDeleteUser = async (email) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return
    try {
      const response = await fetch(`/api/members?email=${email}`, { method: 'DELETE' })
      if (response.ok) {
        setUsers(users.filter(u => u.email !== email))
        setStats(prev => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }))
        alert('ลบผู้ใช้สำเร็จ')
      } else {
        alert('เกิดข้อผิดพลาดในการลบผู้ใช้')
      }
    } catch (e) {
      console.error('Error deleting user:', e)
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้')
    }
  }

  const handleDeleteRecipe = async (recipeId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสูตรอาหารนี้?')) return
    try {
      const response = await fetch(`/api/recipes?id=${recipeId}`, { method: 'DELETE' })
      if (response.ok) {
        const updatedRecipes = recipes.filter(r => r.Recipe_code !== recipeId)
        setRecipes(updatedRecipes)
        setStats(prev => ({ ...prev, totalRecipes: Math.max(0, prev.totalRecipes - 1) }))
        // อัปเดตสถิติภายใน
        calculateMealStats(updatedRecipes)
        calculateDiseaseStats(updatedRecipes, diseases)
        alert('ลบสูตรอาหารสำเร็จ')
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'เกิดข้อผิดพลาดในการลบสูตรอาหาร')
      }
    } catch (e) {
      console.error('Error deleting recipe:', e)
      alert('เกิดข้อผิดพลาดในการลบสูตรอาหาร')
    }
  }

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe)
    setShowEditModal(true)
  }

  const handleUpdateRecipe = async (updatedRecipe) => {
    try {
      const diseaseCodeCsv = diseaseNamesToIdsCsv(updatedRecipe.Disease_tags)
      const response = await fetch('/api/recipes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedRecipe.Recipe_code,
          title: updatedRecipe.Recipe_name,
          description: updatedRecipe.Description,
          details: updatedRecipe.Description,       // sync ไปที่ details
          image: updatedRecipe.Image,
          diseaseTags: updatedRecipe.Disease_tags,
          diseaseCode: diseaseCodeCsv,              // ส่ง id CSV
          meal: updatedRecipe.Meal,
          ingredients: updatedRecipe.Ingredients,
          instructions: updatedRecipe.Instructions
        })
      })
      if (response.ok) {
        const updated = recipes.map(r => r.Recipe_code === updatedRecipe.Recipe_code ? updatedRecipe : r)
        setRecipes(updated)
        calculateMealStats(updated)
        calculateDiseaseStats(updated, diseases)
        setShowEditModal(false)
        setEditingRecipe(null)
        alert('อัปเดตสูตรอาหารสำเร็จ')
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'เกิดข้อผิดพลาดในการอัปเดตสูตรอาหาร')
      }
    } catch (e) {
      console.error('Error updating recipe:', e)
      alert('เกิดข้อผิดพลาดในการอัปเดตสูตรอาหาร')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/Login')
  }

  // ====== Disease CRUD ======
  const handleDiseaseSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingDisease ? 'PUT' : 'POST'
      const response = await fetch('/api/admin-diseases', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...diseaseFormData,
          ...(editingDisease && { id: editingDisease.id })
        })
      })
      const data = await response.json()
      if (response.ok) {
        alert(data.message || 'บันทึกข้อมูลสำเร็จ')
        setDiseaseFormData({ name: '', color: '#94a3b8' })
        setShowDiseaseForm(false)
        setEditingDisease(null)
        loadAdminData()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (e) {
      console.error('Error saving disease:', e)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }

  const handleDiseaseEdit = (disease) => {
    setDiseaseFormData({ name: disease.name, color: disease.color || '#94a3b8' })
    setEditingDisease(disease)
    setShowDiseaseForm(true)
  }

  const handleDiseaseDelete = async (id) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโรคนี้?')) return
    try {
      const response = await fetch(`/api/admin-diseases?id=${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        alert(data.message || 'ลบโรคสำเร็จ')
        loadAdminData()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการลบโรค')
      }
    } catch (e) {
      console.error('Error deleting disease:', e)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }

  const cancelDiseaseEdit = () => {
    setDiseaseFormData({ name: '', color: '#94a3b8' })
    setEditingDisease(null)
    setShowDiseaseForm(false)
  }

  // ====== User edit ======
  const handleUserEdit = (user) => {
    setEditingUser({ ...user, isActive: user.otp !== 'DISABLED' })
    setShowUserEditModal(true)
  }

  const handleUserUpdate = async (updatedUser) => {
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
      })
      const data = await response.json()
      if (response.ok) {
        alert(data.message || 'อัปเดตข้อมูลผู้ใช้สำเร็จ')
        setShowUserEditModal(false)
        setEditingUser(null)
        loadAdminData()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้')
      }
    } catch (e) {
      console.error('Error updating user:', e)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }

  const handleUserDelete = async (email) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? การกระทำนี้จะลบข้อมูลทั้งหมดที่เกี่ยวข้อง')) return
    try {
      const response = await fetch(`/api/admin-users?email=${email}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        alert(data.message || 'ลบผู้ใช้สำเร็จ')
        loadAdminData()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้')
      }
    } catch (e) {
      console.error('Error deleting user:', e)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }

  // ====== Filters ======
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRecipes = recipes.filter((recipe) => {
    const q = String(searchTerm || '').toLowerCase().trim();
    if (!q) return true;
    const byTitle      = String(recipe.Recipe_name || '').toLowerCase().includes(q);
    const byDesc       = String(recipe.Description  || '').toLowerCase().includes(q);
    const byDiseaseTag = String(recipe.Disease_tags || '').toLowerCase().includes(q);
    const mealName     = getMealName(String(recipe.Meal));
    const byMealName   = String(mealName || '').toLowerCase().includes(q);
    return byTitle || byDesc || byDiseaseTag || byMealName;
  });

  const filteredDiseases = diseases.filter(disease => 
    disease.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Dashboard</h1>
          <div className={styles.adminInfo}>
            <Link 
              href="/"
              className={styles.logoutBtn}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--primary-600)',
                borderColor: 'var(--primary-700)'
              }}
              title="กลับหน้าหลัก"
            >
              <FaHome /> กลับหน้าหลัก
            </Link>

            <span style={{ marginLeft: '0.75rem' }}>
              สวัสดี, {adminInfo?.name || 'แอดมิน'}
            </span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <FaSignOutAlt /> ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartBar /> ภาพรวม
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> จัดการผู้ใช้
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'diseases' ? styles.active : ''}`}
          onClick={() => setActiveTab('diseases')}
        >
          <FaFilter /> จัดการโรค
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'recipes' ? styles.active : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          <FaUtensils /> จัดการสูตรอาหาร
        </button>
      </nav>

      {/* Main */}
      <main className={styles.main}>
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className={styles.overview}>
            <h2>ภาพรวมระบบ</h2>

            {/* KPI cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <FaUsers className={styles.statIcon} />
                <div className={styles.statContent}>
                  <h3>{stats.totalUsers}</h3>
                  <p>ผู้ใช้ทั้งหมด</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <FaUtensils className={styles.statIcon} />
                <div className={styles.statContent}>
                  <h3>{stats.totalRecipes}</h3>
                  <p>สูตรอาหารทั้งหมด</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <FaBookmark className={styles.statIcon} />
                <div className={styles.statContent}>
                  <h3>{stats.totalBookmarks}</h3>
                  <p>บุ๊คมาร์คทั้งหมด</p>
                </div>
              </div>
              <div className={styles.statCard}>
                <FaComments className={styles.statIcon} />
                <div className={styles.statContent}>
                  <h3>{stats.totalComments}</h3>
                  <p>ความคิดเห็นทั้งหมด</p>
                </div>
              </div>
            </div>

            {/* Recipe Statistics by Disease and Meal */}
            <div className={styles.recipeStats}>
              <div className={styles.statsSection}>
                <h3>สูตรอาหารตามโรค</h3>
                <div className={styles.statsList}>
                  {diseaseStats.map((disease, index) => (
                    <div key={index} className={styles.statItem}>
                      <div className={styles.statItemContent}>
                        <span className={styles.statItemName}>{disease.name}</span>
                        <span className={styles.statItemCount}>{disease.count} สูตร</span>
                      </div>
                      <div className={styles.statItemBar}>
                        <div 
                          className={styles.statItemProgress}
                          style={{ 
                            width: `${diseaseStats.length > 0 ? (disease.count / Math.max(...diseaseStats.map(d => d.count))) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {diseaseStats.length === 0 && (
                    <p className={styles.noData}>ไม่มีข้อมูลโรค</p>
                  )}
                </div>
              </div>

              <div className={styles.statsSection}>
                <h3>สูตรอาหารตามมื้อ</h3>
                <div className={styles.statsList}>
                  {mealStats.map((meal, index) => (
                    <div key={index} className={styles.statItem}>
                      <div className={styles.statItemContent}>
                        <span className={styles.statItemName}>{meal.name}</span>
                        <span className={styles.statItemCount}>{meal.count} สูตร</span>
                      </div>
                      <div className={styles.statItemBar}>
                        <div 
                          className={styles.statItemProgress}
                          style={{ 
                            width: `${mealStats.length > 0 && Math.max(...mealStats.map(m => m.count)) > 0 ? (meal.count / Math.max(...mealStats.map(m => m.count))) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {mealStats.length === 0 && (
                    <p className={styles.noData}>ไม่มีข้อมูลมื้ออาหาร</p>
                  )}
                </div>
              </div>

              {/* ✅ ใหม่: จำนวนสมาชิกตามโรคที่สนใจ (จากหน้าโปรไฟล์) */}
              <div className={styles.statsSection}>
                <h3>
                  จำนวนสมาชิกตามโรคที่สนใจ
                  {stats.diseaseSource && (
                    <span className={styles.badge} style={{ marginLeft: 8 }}>
                    
                    </span>
                  )}
                </h3>
                <div className={styles.statsList}>
                  {stats.diseaseStatsFromProfiles?.length > 0 ? (
                    stats.diseaseStatsFromProfiles.map((item, i) => {
                      const max = Math.max(...stats.diseaseStatsFromProfiles.map(d => Number(d.member_count) || 0)) || 1
                      const count = Number(item.member_count) || 0
                      const percent = Math.round((count / max) * 100)
                      return (
                        <div key={i} className={styles.statItem}>
                          <div className={styles.statItemContent}>
                            <span className={styles.statItemName}>
                              {item.disease_name || 'ไม่ระบุ'}
                            </span>
                            <span className={styles.statItemCount}>{count} คน</span>
                          </div>
                          <div className={styles.statItemBar}>
                            <div
                              className={styles.statItemProgress}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className={styles.noData}>ไม่มีข้อมูลสมาชิกตามโรค</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {stats.recent && (
              <div className={styles.recentActivity}>
                <h3>กิจกรรมล่าสุด</h3>
                <div className={styles.activityGrid}>
                  <div className={styles.activitySection}>
                    <h4><FaUsers /> ผู้ใช้ใหม่</h4>
                    <div className={styles.activityList}>
                      {stats.recent.users?.map((user, index) => (
                        <div key={index} className={styles.activityItem}>
                          <img src={user.image} alt={user.name} className={styles.activityImage} />
                          <div className={styles.activityContent}>
                            <p className={styles.activityName}>{user.name}</p>
                            <p className={styles.activityEmail}>{user.email}</p>
                          </div>
                        </div>
                      ))}
                      {(!stats.recent.users || stats.recent.users.length === 0) && (
                        <p className={styles.noActivity}>ไม่มีผู้ใช้ใหม่ในสัปดาห์นี้</p>
                      )}
                    </div>
                  </div>

                  <div className={styles.activitySection}>
                    <h4><FaUtensils /> สูตรอาหารใหม่</h4>
                    <div className={styles.activityList}>
                      {stats.recent.recipes?.map((recipe, index) => (
                        <div key={index} className={styles.activityItem}>
                          <img src={recipe.image} alt={recipe.title} className={styles.activityImage} />
                          <div className={styles.activityContent}>
                            <p className={styles.activityName}>{recipe.title}</p>
                            <p className={styles.activityDescription}>{recipe.description}</p>
                          </div>
                        </div>
                      ))}
                      {(!stats.recent.recipes || stats.recent.recipes.length === 0) && (
                        <p className={styles.noActivity}>ไม่มีสูตรอาหารใหม่ในสัปดาห์นี้</p>
                      )}
                    </div>
                  </div>

                  <div className={styles.activitySection}>
                    <h4><FaComments /> ความคิดเห็นล่าสุด</h4>
                    <div className={styles.activityList}>
                      {stats.recent.comments?.map((comment, index) => (
                        <div key={index} className={styles.activityItem}>
                          <img src={comment.authorImage} alt={comment.authorName} className={styles.activityImage} />
                          <div className={styles.activityContent}>
                            <p className={styles.activityName}>{comment.authorName}</p>
                            <p className={styles.activityDescription}>{comment.body}</p>
                            <p className={styles.activityRecipe}>ใน: {comment.recipeTitle}</p>
                          </div>
                        </div>
                      ))}
                      {(!stats.recent.comments || stats.recent.comments.length === 0) && (
                        <p className={styles.noActivity}>ไม่มีความคิดเห็นใหม่ในสัปดาห์นี้</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={styles.users}>
            <div className={styles.sectionHeader}>
              <h2>จัดการผู้ใช้</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className={styles.searchBox}>
                  <FaSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="ค้นหาผู้ใช้..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
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
                        fontSize: '1.5rem',
                        overflow: 'hidden'
                      }}>
                        {user.image && user.image !== '/images/GF3.jpg' ? (
                          <img 
                            src={user.image} 
                            alt={user.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <FaUser />
                        )}
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
                        {user.comment && (
                          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            หมายเหตุ: {user.comment}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleUserEdit(user)}
                        className={styles.submitButton}
                        style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        <FaEdit /> แก้ไข
                      </button>
                      <button 
                        onClick={() => handleUserDelete(user.email)}
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
          </div>
        )}

        {/* Diseases Tab */}
        {activeTab === 'diseases' && (
          <div className={styles.diseases}>
            <div className={styles.sectionHeader}>
              <h2>จัดการโรค</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setShowDiseaseForm(true)}
                  className={styles.submitButton}
                  style={{ margin: 0, padding: '0.75rem 1.5rem' }}
                >
                  <FaPlus /> เพิ่มโรคใหม่
                </button>
                <div className={styles.searchBox}>
                  <FaSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="ค้นหาโรค..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {showDiseaseForm && (
              <div className={styles.statCard} style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
                  {editingDisease ? 'แก้ไขโรค' : 'เพิ่มโรคใหม่'}
                </h3>
                <form onSubmit={handleDiseaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                      ชื่อโรค
                    </label>
                    <input
                      type="text"
                      value={diseaseFormData.name}
                      onChange={(e) => setDiseaseFormData({ ...diseaseFormData, name: e.target.value })}
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
                      <FaSave /> {editingDisease ? 'อัปเดต' : 'เพิ่ม'}
                    </button>
                    <button type="button" onClick={cancelDiseaseEdit} className={styles.logoutBtn} style={{ flex: 1 }}>
                      <FaTimes /> ยกเลิก
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredDiseases.map((disease) => (
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
                        onClick={() => handleDiseaseEdit(disease)}
                        className={styles.submitButton}
                        style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        <FaEdit /> แก้ไข
                      </button>
                      <button 
                        onClick={() => handleDiseaseDelete(disease.id)}
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

            {filteredDiseases.length === 0 && (
              <div className={styles.statCard} style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  {searchTerm ? 'ไม่พบโรคที่ตรงกับการค้นหา' : 'ยังไม่มีโรคในระบบ'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <div className={styles.recipes}>
            <div className={styles.sectionHeader}>
              <h2>จัดการสูตรอาหาร</h2>
            </div>
            
            <div className={styles.recipesGrid}>
              {filteredRecipes.map((recipe, index) => (
                <div key={index} className={styles.recipeCard}>
                  <img 
                    src={recipe.Image || '/images/GF3.jpg'} 
                    alt={recipe.Recipe_name}
                    className={styles.recipeImage}
                  />
                  <div className={styles.recipeContent}>
                    <h3>{recipe.Recipe_name}</h3>
                    <p className={styles.recipeDescription}>
                      {recipe.Description?.substring(0, 100)}...
                    </p>
                    <div className={styles.recipeTags}>
                      {recipe.Disease_tags && (
                        <>
                          {recipe.Disease_tags.split(',').map((tag, i) => {
                            const diseasePalette = ['#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD', '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'];
                            const getDiseaseColor = (id) => diseasePalette[(Number(id) || 0) % diseasePalette.length];
                            return (
                              <span 
                                key={i} 
                                className={styles.recipeTag}
                                style={{ 
                                  backgroundColor: getDiseaseColor(i),
                                  color: '#000000',
                                  borderColor: getDiseaseColor(i),
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '8px',
                                  fontSize: '0.7rem'
                                }}
                              >
                                {tag.trim()}
                              </span>
                            );
                          })}
                        </>
                      )}
                      {getMealName(recipe.Meal) && (
                        <span 
                          className={styles.mealTag}
                          style={{ 
                            background: recipe.Meal === '1' || recipe.Meal === 'breakfast' ? '#FEF08A' : 
                                       recipe.Meal === '2' || recipe.Meal === 'lunch' ? '#BBF7D0' : 
                                       recipe.Meal === '3' || recipe.Meal === 'dinner' ? '#DDD6FE' : '#48bb78',
                            color: '#000000',
                            borderColor: recipe.Meal === '1' || recipe.Meal === 'breakfast' ? '#FEF08A' : 
                                       recipe.Meal === '2' || recipe.Meal === 'lunch' ? '#BBF7D0' : 
                                       recipe.Meal === '3' || recipe.Meal === 'dinner' ? '#DDD6FE' : '#48bb78',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '8px',
                            fontSize: '0.7rem'
                          }}
                        >
                          {getMealName(recipe.Meal)}
                        </span>
                      )}
                    </div>
                    <div className={styles.recipeActions}>
                      <button 
                        className={styles.viewBtn}
                        onClick={() => router.push(`/recipes/${recipe.Recipe_code}`)}
                      >
                        <FaEye /> ดู
                      </button>
                      <button 
                        className={styles.editBtn}
                        onClick={() => router.push(`/edit-recipe?id=${recipe.Recipe_code}`)}
                      >
                        <FaEdit /> แก้ไข
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteRecipe(recipe.Recipe_code)}
                      >
                        <FaTrash /> ลบ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Recipe Modal */}
      {showEditModal && editingRecipe && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>แก้ไขสูตรอาหาร</h3>
              <button 
                className={styles.closeBtn}
                onClick={() => {
                  setShowEditModal(false)
                  setEditingRecipe(null)
                }}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <EditRecipeForm 
                recipe={editingRecipe}
                onSave={handleUpdateRecipe}
                onCancel={() => {
                  setShowEditModal(false)
                  setEditingRecipe(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showUserEditModal && editingUser && (
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
              handleUserUpdate(editingUser);
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
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className={styles.submitButton} style={{ margin: 0, flex: 1 }}>
                  บันทึก
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowUserEditModal(false);
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
  )
}

// ====== Edit Recipe Form ======
function EditRecipeForm({ recipe, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    Recipe_name: recipe.Recipe_name || '',
    Description: recipe.Description || '',
    Image: recipe.Image || '',
    Disease_tags: recipe.Disease_tags || '',
    Meal: recipe.Meal || '',
    Ingredients: recipe.Ingredients || '',
    Instructions: recipe.Instructions || ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...recipe, ...formData })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.editForm}>
      <div className={styles.formGroup}>
        <label>ชื่อสูตรอาหาร</label>
        <input
          type="text"
          name="Recipe_name"
          value={formData.Recipe_name}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>คำอธิบาย</label>
        <textarea
          name="Description"
          value={formData.Description}
          onChange={handleChange}
          rows="3"
        />
      </div>

      <div className={styles.formGroup}>
        <label>รูปภาพ (URL)</label>
        <input
          type="url"
          name="Image"
          value={formData.Image}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label>โรคประจำตัว (คั่นด้วยจุลภาค)</label>
        <input
          type="text"
          name="Disease_tags"
          value={formData.Disease_tags}
          onChange={handleChange}
          placeholder="เบาหวาน, ความดันสูง"
        />
      </div>

      <div className={styles.formGroup}>
        <label>มื้ออาหาร</label>
        <select
          name="Meal"
          value={formData.Meal}
          onChange={handleChange}
        >
          <option value="1">มื้อเช้า</option>
          <option value="2">มื้อกลางวัน</option>
          <option value="3">มื้อเย็น</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label>ส่วนผสม</label>
        <textarea
          name="Ingredients"
          value={formData.Ingredients}
          onChange={handleChange}
          rows="4"
        />
      </div>

      <div className={styles.formGroup}>
        <label>วิธีทำ</label>
        <textarea
          name="Instructions"
          value={formData.Instructions}
          onChange={handleChange}
          rows="6"
        />
      </div>

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className={styles.cancelBtn}>
          ยกเลิก
        </button>
        <button type="submit" className={styles.saveBtn}>
          บันทึก
        </button>
      </div>
    </form>
  )
}
