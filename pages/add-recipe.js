import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AddRecipe.module.css';
import { FaUpload, FaPlus, FaTimes, FaUtensils } from 'react-icons/fa';
import { MdRestaurant, MdWbSunny, MdNightsStay } from 'react-icons/md';

export default function AddRecipe() {
  const router = useRouter();

  const [recipeData, setRecipeData] = useState({
    title: '',
    description: '',
    imagePreview: null,
    imageFile: null,
    ingredients: [''],
    steps: [''],
    selectedDiseases: [],
    selectedMeals: [],
    cookTime: '',
    calories: '',
    member_email: '',
    admin: ''
  });

  const [diseases, setDiseases] = useState([]);
  const [newDiseaseName, setNewDiseaseName] = useState('');

  const diseasePalette = [
    '#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD',
    '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'
  ];
  const getDiseaseColor = (id) => diseasePalette[(Number(id) || 0) % diseasePalette.length];

  useEffect(() => {
    const loadDiseases = async () => {
      try {
        const res = await fetch('/api/diseases');
        const data = await res.json();
        if (res.ok) setDiseases(data.diseases || []);
      } catch (err) {
        console.error('โหลดรายชื่อโรคไม่สำเร็จ:', err);
      }
    };
    loadDiseases();
  }, []);

  const mealTypes = [
    { id: 'breakfast', name: 'มื้อเช้า', icon: <MdWbSunny />, color: '#FEF08A' },
    { id: 'lunch', name: 'มื้อกลางวัน', icon: <MdRestaurant />, color: '#BBF7D0' },
    { id: 'dinner', name: 'มื้อเย็น', icon: <MdNightsStay />, color: '#DDD6FE' }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('ไฟล์รูปภาพมีขนาดเกิน 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRecipeData({
          ...recipeData,
          imagePreview: reader.result,
          imageFile: file
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...recipeData.ingredients];
    newIngredients[index] = value;
    setRecipeData({ ...recipeData, ingredients: newIngredients });
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...recipeData.steps];
    newSteps[index] = value;
    setRecipeData({ ...recipeData, steps: newSteps });
  };

  const addIngredient = () => {
    setRecipeData({
      ...recipeData,
      ingredients: [...recipeData.ingredients, '']
    });
  };

  const addStep = () => {
    setRecipeData({
      ...recipeData,
      steps: [...recipeData.steps, '']
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = recipeData.ingredients.filter((_, i) => i !== index);
    setRecipeData({ ...recipeData, ingredients: newIngredients });
  };

  const removeStep = (index) => {
    const newSteps = recipeData.steps.filter((_, i) => i !== index);
    setRecipeData({ ...recipeData, steps: newSteps });
  };

  const toggleDisease = (diseaseId) => {
    setRecipeData(prev => ({ ...prev, selectedDiseases: [diseaseId] }));
  };

  const selectMeal = mealId => setRecipeData(d => ({ ...d, selectedMeals: [mealId] }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('Recipe_name', recipeData.title);
    formData.append('details', recipeData.description);
    formData.append('Meal', recipeData.selectedMeals[0] || '');
    formData.append('method', JSON.stringify(recipeData.steps));
    formData.append('raw_material', JSON.stringify(recipeData.ingredients));

    const selectedDiseaseId = recipeData.selectedDiseases[0];
    const selectedDisease = diseases.find(d => d.id === selectedDiseaseId);
    formData.append('Disease_tags', selectedDisease ? selectedDisease.name : '');
    formData.append('Member_email', recipeData.member_email || '');
    formData.append('Disease_code', selectedDiseaseId || '');
    formData.append('Admin', recipeData.admin || '');

    if (recipeData.imageFile) formData.append('Image', recipeData.imageFile);

    try {
      const response = await fetch('/api/add-recipe', {
        method: 'POST',
        body: formData
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON response: ${text}`);
      }

      if (response.ok) {
        alert('✅ เพิ่มสูตรอาหารเรียบร้อยแล้ว!');
        setRecipeData({
          title: '',
          description: '',
          imagePreview: null,
          imageFile: null,
          ingredients: [''],
          steps: [''],
          selectedDiseases: [],
          selectedMeals: [],
          member_email: '',
          admin: ''
        });
      } else {
        const detail = data && (data.error || data.sqlMessage || data.code);
        alert(`${data?.message || 'เกิดข้อผิดพลาดในการเพิ่มสูตรอาหาร'}${detail ? `\nรายละเอียด: ${detail}` : ''}`);
      }
    } catch (error) {
      console.error('Error submitting recipe:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button type="button" className={styles.backButton} onClick={() => router.back()}>
            <span>←</span> ย้อนกลับ
          </button>

          <h1 className={styles.title}>เพิ่มสูตรอาหาร</h1>

          {/* ช่องว่างถ่วงน้ำหนักฝั่งขวา เพื่อให้หัวข้อกลางจริง */}
          <div className={styles.topBarRight} aria-hidden="true" />
        </div>


        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 📸 อัพโหลดรูปภาพ */}
          <div className={styles.imageUpload}>
            {recipeData.imagePreview ? (
              <div className={styles.previewContainer}>
                <img src={recipeData.imagePreview} alt="Preview" className={styles.preview} />
                <button
                  type="button"
                  onClick={() => setRecipeData({ ...recipeData, imagePreview: null, imageFile: null })}
                  className={styles.removeImage}
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <label className={styles.uploadLabel}>
                <FaUpload />
                <span>อัพโหลดรูปภาพ</span>
                <input type="file" accept="image/*" onChange={handleImageChange} hidden />
              </label>
            )}
          </div>

          {/* 🧾 ข้อมูลพื้นฐาน */}
          <div className={styles.formGroup}>
            <label>ชื่อเมนู</label>
            <input
              type="text"
              value={recipeData.title}
              onChange={(e) => setRecipeData({ ...recipeData, title: e.target.value })}
              placeholder="ใส่ชื่อเมนูอาหาร"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>คำอธิบาย</label>
            <textarea
              value={recipeData.description}
              onChange={(e) => setRecipeData({ ...recipeData, description: e.target.value })}
              placeholder="อธิบายเกี่ยวกับเมนูนี้"
            />
          </div>

          {/* 🥣 ส่วนผสม */}
          <div className={styles.formGroup}>
            <label>ส่วนผสม</label>
            {recipeData.ingredients.map((ingredient, index) => (
              <div key={index} className={styles.listItem}>
                <input
                  type="text"
                  value={ingredient}
                  onChange={(e) => handleIngredientChange(index, e.target.value)}
                  placeholder="เช่น น้ำตาล 2 ช้อนโต๊ะ"
                />
                {recipeData.ingredients.length > 1 && (
                  <button type="button" onClick={() => removeIngredient(index)} className={styles.removeButton}>
                    <FaTimes />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addIngredient} className={styles.addButton}>
              <FaPlus /> เพิ่มส่วนผสม
            </button>
          </div>

          {/* 🍳 วิธีทำ */}
          <div className={styles.formGroup}>
            <label>วิธีทำ</label>
            {recipeData.steps.map((step, index) => (
              <div key={index} className={styles.listItem}>
                <textarea
                  value={step}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  placeholder={`ขั้นตอนที่ ${index + 1}`}
                />
                {recipeData.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(index)} className={styles.removeButton}>
                    <FaTimes />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} className={styles.addButton}>
              <FaPlus /> เพิ่มขั้นตอน
            </button>
          </div>

          {/* 🏷️ แท็กโรค */}
          <div className={styles.formGroup}>
            <label>เหมาะสำหรับผู้ป่วย</label>
            <div className={styles.tagGrid}>
              {diseases.map((disease) => (
                <button
                  key={disease.id}
                  type="button"
                  className={`${styles.tagButton} ${recipeData.selectedDiseases.includes(disease.id) ? styles.tagSelected : ''
                    }`}
                  style={{
                    backgroundColor: recipeData.selectedDiseases.includes(disease.id)
                      ? getDiseaseColor(disease.id)
                      : 'transparent',
                    borderColor: getDiseaseColor(disease.id)
                  }}
                  onClick={() => toggleDisease(disease.id)}
                >
                  {disease.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="text"
                value={newDiseaseName}
                onChange={(e) => setNewDiseaseName(e.target.value)}
                placeholder="เพิ่มชื่อแท็กโรคใหม่"
              />
              <button
                type="button"
                onClick={async () => {
                  const name = newDiseaseName.trim();
                  if (!name) return;
                  try {
                    const res = await fetch('/api/diseases', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setDiseases((prev) => [...prev, { id: data.id, name: data.name }]);
                      setNewDiseaseName('');
                    } else {
                      alert(data.message || 'เพิ่มแท็กโรคล้มเหลว');
                    }
                  } catch {
                    alert('ไม่สามารถเพิ่มแท็กโรคได้');
                  }
                }}
                className={styles.addButton}
              >
                เพิ่มแท็กโรค
              </button>
            </div>
          </div>

          {/* 🍽️ มื้ออาหาร */}
          <div className={styles.formGroup}>
            <label>มื้ออาหาร</label>
            <div className={styles.tagGrid}>
              {mealTypes.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  className={`${styles.tagButton} ${recipeData.selectedMeals.includes(meal.id) ? styles.tagSelected : ''
                    }`}
                  style={{
                    backgroundColor: recipeData.selectedMeals.includes(meal.id)
                      ? meal.color
                      : 'transparent',
                    borderColor: meal.color
                  }}
                  onClick={() => selectMeal(meal.id)}
                >
                  {meal.icon} {meal.name}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className={styles.submitButton}>
            <FaUtensils /> บันทึกสูตรอาหาร
          </button>
        </form>
      </div>
    </div>
  );
}
