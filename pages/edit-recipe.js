import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/AddRecipe.module.css';
import { FaUpload, FaPlus, FaTimes, FaUtensils, FaArrowLeft } from 'react-icons/fa';
import { MdRestaurant, MdWbSunny, MdNightsStay } from 'react-icons/md';

export default function EditRecipe() {
  const router = useRouter();
  const { id } = router.query;

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
    calories: ''
  });

  const [diseases, setDiseases] = useState([]);
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const diseasePalette = ['#FFB6C1', '#ADD8E6', '#FFD700', '#98FB98', '#DDA0DD', '#F0E68C', '#CDE7FF', '#FECACA', '#DCFCE7', '#E9D5FF'];
  const getDiseaseColor = (id) => diseasePalette[(Number(id) || 0) % diseasePalette.length];

  useEffect(() => {
    const loadDiseases = async () => {
      try {
        const res = await fetch('/api/diseases');
        const data = await res.json();
        if (res.ok) setDiseases(data.diseases || []);
      } catch { }
    };
    loadDiseases();
  }, []);

  useEffect(() => {
    if (id && diseases.length > 0) {
      loadRecipe();
    }
  }, [id, diseases]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recipes/${id}`);
      const data = await response.json();

      if (response.ok && data.recipe) {
        const recipe = data.recipe;

        // แปลงข้อมูลจากฐานข้อมูล - ใช้ parseList function เหมือนหน้าดูสูตร
        const parseList = (v) => {
          if (v == null) return [];
          let s = String(v).trim();

          // พยายามคลี่ JSON ซ้อนสูงสุด 3 ชั้น
          for (let i = 0; i < 3; i++) {
            try {
              const parsed = JSON.parse(s);
              // ถ้าได้ array จริงแล้ว
              if (Array.isArray(parsed)) {
                // กรณีเป็น ["[\"...\"]"] -> คลี่ต่อ
                if (
                  parsed.length === 1 &&
                  typeof parsed[0] === 'string' &&
                  /^\s*\[/.test(parsed[0])
                ) {
                  s = parsed[0];
                  continue; // ลูป parse ต่อ
                }
                // ได้ array สุดท้ายแล้ว
                return parsed.map(x => String(x).trim()).filter(Boolean);
              }
              // ถ้า parse แล้วได้ string ให้ลองต่อ
              if (typeof parsed === 'string') {
                s = parsed;
                continue;
              }
            } catch {
              // ไม่ใช่ JSON แล้ว -> ออกจากลูปไปใช้ fallback
            }
            break;
          }

          // Fallback: แยกบรรทัด/คอมมา/เซมิโคลอน
          return s
            .replace(/\r\n?/g, '\n')
            .split(/\n|,|;/)
            .map(t => t.trim())
            .filter(Boolean);
        };

        const ingredients = parseList(recipe.raw_material);
        const steps = parseList(recipe.method);

        // Debug: แสดงข้อมูลที่โหลดมา
        console.log('Loaded recipe data:');
        console.log('- Meal:', recipe.Meal, 'Type:', typeof recipe.Meal);
        console.log('- Disease_tags:', recipe.Disease_tags, 'Type:', typeof recipe.Disease_tags);
        console.log('- Disease_code:', recipe.Disease_code, 'Type:', typeof recipe.Disease_code);

        // แปลง Meal จาก string (คั่นด้วยจุลภาค) เป็น array
        let selectedMeals = [];
        if (recipe.Meal) {
          const mealMap = { '1': 'breakfast', '2': 'lunch', '3': 'dinner' };
          // ถ้าเป็น string คั่นด้วยจุลภาค ให้แยกออกมา
          if (typeof recipe.Meal === 'string' && recipe.Meal.includes(',')) {
            selectedMeals = recipe.Meal.split(',')
              .map(m => {
                const trimmed = m.trim();
                // ถ้าเป็นตัวเลข ให้แปลงเป็น string
                if (mealMap[trimmed]) {
                  return mealMap[trimmed];
                }
                // ถ้าเป็น string อยู่แล้ว ให้ใช้เลย
                return trimmed;
              })
              .filter(Boolean);
          } else if (typeof recipe.Meal === 'string') {
            // ถ้าเป็น string เดียว (เช่น "1" หรือ "breakfast")
            if (mealMap[recipe.Meal]) {
              selectedMeals = [mealMap[recipe.Meal]];
            } else if (['breakfast', 'lunch', 'dinner'].includes(recipe.Meal)) {
              selectedMeals = [recipe.Meal];
            }
          } else {
            // ถ้าเป็นตัวเลขเดียว
            selectedMeals = [mealMap[String(recipe.Meal)]] || [];
          }
        }

        // แปลง Disease_tags เป็น selectedDiseases
        let selectedDiseases = [];
        if (recipe.Disease_tags) {
          // ถ้าเป็น string คั่นด้วยจุลภาค ให้แยกออกมา
          if (typeof recipe.Disease_tags === 'string' && recipe.Disease_tags.includes(',')) {
            const diseaseNames = recipe.Disease_tags.split(',').map(d => d.trim());
            selectedDiseases = diseases.filter(d => diseaseNames.includes(d.name)).map(d => d.id);
          } else {
            // ถ้าเป็นชื่อโรคเดียว
            const disease = diseases.find(d => d.name === recipe.Disease_tags);
            if (disease) selectedDiseases = [disease.id];
          }
        }
        
        // Fallback: ใช้ Disease_code ถ้าไม่มี Disease_tags
        if (selectedDiseases.length === 0 && recipe.Disease_code) {
          selectedDiseases = [recipe.Disease_code];
        }

        // Debug: แสดงข้อมูลที่แปลงแล้ว
        console.log('Converted data:');
        console.log('- selectedMeals:', selectedMeals);
        console.log('- selectedDiseases:', selectedDiseases);
        console.log('- Original Meal string:', recipe.Meal);
        console.log('- Parsed meal array:', selectedMeals);

        setRecipeData({
          title: recipe.Recipe_name || '',
          description: recipe.details || '',
          imagePreview: recipe.Image || null,
          imageFile: null,
          ingredients: ingredients.length > 0 ? ingredients : [''],
          steps: steps.length > 0 ? steps : [''],
          selectedDiseases: selectedDiseases,
          selectedMeals: selectedMeals,
          cookTime: '',
          calories: ''
        });
      } else {
        alert('ไม่พบสูตรอาหารที่ต้องการแก้ไข');
        router.push('/AdminDashboard');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลสูตรอาหาร');
    } finally {
      setLoading(false);
    }
  };

  const mealTypes = [
    { id: 'breakfast', name: 'มื้อเช้า', icon: <MdWbSunny />, color: '#FEF08A' },
    { id: 'lunch', name: 'มื้อกลางวัน', icon: <MdRestaurant />, color: '#BBF7D0' },
    { id: 'dinner', name: 'มื้อเย็น', icon: <MdNightsStay />, color: '#DDD6FE' }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
    setRecipeData(prev => {
      const isSelected = prev.selectedDiseases.includes(diseaseId);
      if (isSelected) {
        // ถ้าเลือกอยู่แล้ว ให้ยกเลิกการเลือก
        return {
          ...prev,
          selectedDiseases: prev.selectedDiseases.filter(id => id !== diseaseId)
        };
      } else {
        // ถ้ายังไม่ได้เลือก ให้เพิ่มเข้าไป
        return {
          ...prev,
          selectedDiseases: [...prev.selectedDiseases, diseaseId]
        };
      }
    });
  };

  const selectMeal = (mealId) => {
    console.log('selectMeal function called with:', mealId);
    console.log('Current recipeData.selectedMeals:', recipeData.selectedMeals);
    
    setRecipeData(prev => {
      const isSelected = prev.selectedMeals.includes(mealId);
      console.log('Is meal selected:', isSelected);
      
      if (isSelected) {
        // ถ้าเลือกอยู่แล้ว ให้ยกเลิกการเลือก
        const newSelectedMeals = prev.selectedMeals.filter(id => id !== mealId);
        console.log('Removing meal, new selectedMeals:', newSelectedMeals);
        return {
          ...prev,
          selectedMeals: newSelectedMeals
        };
      } else {
        // ถ้ายังไม่ได้เลือก ให้เพิ่มเข้าไป
        const newSelectedMeals = [...prev.selectedMeals, mealId];
        console.log('Adding meal, new selectedMeals:', newSelectedMeals);
        return {
          ...prev,
          selectedMeals: newSelectedMeals
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();

      console.log('Recipe data before sending:', recipeData);

      // ส่งข้อมูลทั้งหมด - ใช้ค่าจริงหรือค่าว่าง
      const recipeName = recipeData.title || '';
      const recipeDetails = recipeData.description || '';
      
      // ส่งมื้ออาหารหลายมื้อ (คั่นด้วยจุลภาค)
      const mealsString = recipeData.selectedMeals.join(',');
      const recipeMethod = JSON.stringify(recipeData.steps || ['']);
      const recipeIngredients = JSON.stringify(recipeData.ingredients || ['']);

      // ส่งโรคหลายโรค
      const selectedDiseaseIds = recipeData.selectedDiseases;
      const selectedDiseases = diseases.filter(d => selectedDiseaseIds.includes(d.id));
      
      // สร้าง Disease_tags จากโรคที่เลือก (คั่นด้วยจุลภาค)
      const diseaseTagsString = selectedDiseases.map(d => d.name).join(',');
      
      // ส่ง Disease_code ตัวแรก (สำหรับความเข้ากันได้กับระบบเดิม)
      const diseaseCode = selectedDiseaseIds[0] || '';

      formData.append('Recipe_name', recipeName);
      formData.append('details', recipeDetails);
      formData.append('Meal', mealsString);
      formData.append('method', recipeMethod);
      formData.append('raw_material', recipeIngredients);
      formData.append('Disease_tags', diseaseTagsString);
      formData.append('Disease_code', diseaseCode);

      console.log('Prepared data:');
      console.log('- Recipe_name:', recipeName);
      console.log('- details:', recipeDetails);
      console.log('- Meal:', mealsString);
      console.log('- method:', recipeMethod);
      console.log('- raw_material:', recipeIngredients);
      console.log('- Disease_tags:', diseaseTagsString);
      console.log('- Disease_code:', diseaseCode);

      if (recipeData.imageFile) {
        formData.append('Image', recipeData.imageFile);
      }

      // Debug: แสดงข้อมูลที่ส่งไป
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }

      // Debug: ตรวจสอบข้อมูลสำคัญ
      console.log('Key data checks:');
      console.log('Recipe_name:', recipeData.title, 'Type:', typeof recipeData.title);
      console.log('details:', recipeData.description, 'Type:', typeof recipeData.description);
      console.log('selectedMeals:', recipeData.selectedMeals);
      console.log('selectedDiseases:', recipeData.selectedDiseases);
      console.log('ingredients:', recipeData.ingredients);
      console.log('steps:', recipeData.steps);

      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const text = await response.text();
      console.log('Response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Failed to parse response as JSON:', text);
        throw new Error(`Invalid JSON response: ${text}`);
      }

      if (response.ok) {
        alert('แก้ไขสูตรอาหารเรียบร้อย');
        router.push('/AdminDashboard');
      } else {
        console.error('Update failed:', data);
        const detail = data && (data.error || data.sqlMessage || data.code);
        alert(`${data?.message || 'เกิดข้อผิดพลาดในการแก้ไขสูตรอาหาร'}${detail ? `\nรายละเอียด: ${detail}` : ''}`);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className={styles.spinner}></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button type="button" className={styles.backButton} onClick={() => router.back()}>
            <span>←</span> ย้อนกลับ
          </button>

          <h1 className={styles.title}>แก้ไขสูตรอาหาร</h1>

          {/* ช่องว่างถ่วงน้ำหนักฝั่งขวา เพื่อให้หัวข้อกลางจริง */}
          <div className={styles.topBarRight} aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ส่วนซ้าย - รูปภาพและข้อมูลพื้นฐาน */}
          <div className={styles.formLeft}>
            {/* 📸 อัพโหลดรูปภาพ */}
            <div className={styles.imageUpload}>
              {recipeData.imagePreview ? (
                <div className={styles.previewContainer}>
                  <img
                    src={recipeData.imagePreview}
                    alt="Preview"
                    className={styles.preview}
                  />
                  <button
                    type="button"
                    onClick={() => setRecipeData({
                      ...recipeData,
                      imagePreview: null,
                      imageFile: null
                    })}
                    className={styles.removeImage}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <label className={styles.uploadLabel}>
                  <FaUpload />
                  <span>อัพโหลดรูปภาพ</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    hidden
                  />
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

            {/* 🍽️ มื้ออาหาร */}
            <div className={styles.formGroup}>
              <label>มื้ออาหาร</label>
              <div className={styles.tagGrid}>
                {mealTypes.map(meal => (
                  <button
                    key={meal.id}
                    type="button"
                    className={`${styles.tagButton} ${recipeData.selectedMeals.includes(meal.id) ? styles.tagSelected : ''}`}
                    style={{
                      backgroundColor: recipeData.selectedMeals.includes(meal.id) ? meal.color : 'transparent',
                      borderColor: meal.color
                    }}
                    onClick={() => {
                      console.log('Meal button clicked:', meal.id);
                      console.log('Current selectedMeals:', recipeData.selectedMeals);
                      selectMeal(meal.id);
                    }}
                  >
                    {meal.icon} {meal.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ส่วนขวา - ส่วนผสม วิธีทำ และแท็ก */}
          <div className={styles.formRight}>
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
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className={styles.removeButton}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                className={styles.addButton}
              >
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
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className={styles.removeButton}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className={styles.addButton}
              >
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
                    } catch { }
                  }}
                  className={styles.addButton}
                >
                  เพิ่มแท็กโรค
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={saving}>
            <FaUtensils /> {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </form>
      </div>
    </div>
  );
}
