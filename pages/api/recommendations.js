// /pages/api/recommendations.js
import pool from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, limit = 5 } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Missing email parameter' });
    }

    // ดึงข้อมูลโรคที่ผู้ใช้สนใจ
    const [userRows] = await pool.execute(
      `SELECT Disease_tags 
       FROM members 
       WHERE Email_member = ? 
       LIMIT 1`,
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const diseaseTags = userRows[0].Disease_tags || '';
    const userDiseases = diseaseTags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    // ถ้าผู้ใช้ไม่ได้เลือกโรคที่สนใจ ให้แนะนำสูตรแบบสุ่ม
    if (userDiseases.length === 0) {
      const [randomRecipes] = await pool.execute(
        `SELECT r.Recipe_code, r.Recipe_name, r.Image, r.details, r.Meal, r.Disease_code, r.Disease_tags
         FROM recipes r
         ORDER BY RAND()
         LIMIT ?`,
        [parseInt(limit)]
      );

      const formattedRecipes = randomRecipes.map(recipe => formatRecipe(recipe));
      return res.status(200).json({
        recommendations: formattedRecipes,
        recommendationType: 'random',
        userDiseases: [],
        message: 'แนะนำสูตรอาหารแบบสุ่ม (ยังไม่ได้เลือกโรคที่สนใจ)'
      });
    }

    // หาสูตรอาหารที่เหมาะกับโรคที่ผู้ใช้สนใจ
    let recommendedRecipes = [];
    
    // วิธีที่ 1: หาจาก Disease_tags ที่ตรงกับโรคที่ผู้ใช้สนใจ
    const diseaseConditions = userDiseases.map(() => 'r.Disease_tags LIKE ?').join(' OR ');
    const diseaseParams = userDiseases.map(disease => `%${disease}%`);
    
    const [diseaseBasedRecipes] = await pool.execute(
      `SELECT r.Recipe_code, r.Recipe_name, r.Image, r.details, r.Meal, r.Disease_code, r.Disease_tags
       FROM recipes r
       WHERE ${diseaseConditions}
       ORDER BY RAND()
       LIMIT ?`,
      [...diseaseParams, parseInt(limit)]
    );

    recommendedRecipes = [...diseaseBasedRecipes];

    // วิธีที่ 2: ถ้ายังไม่ครบตาม limit ให้เพิ่มสูตรจาก Disease_code ที่ตรงกับโรค
    if (recommendedRecipes.length < parseInt(limit)) {
      const [diseaseCodeRows] = await pool.execute(
        `SELECT Disease_code FROM diseases WHERE Disease_type IN (${userDiseases.map(() => '?').join(',')})`,
        userDiseases
      );
      
      if (diseaseCodeRows.length > 0) {
        const diseaseCodes = diseaseCodeRows.map(row => row.Disease_code);
        const codeConditions = diseaseCodes.map(() => 'r.Disease_code = ?').join(' OR ');
        const remainingLimit = parseInt(limit) - recommendedRecipes.length;
        
        const [codeBasedRecipes] = await pool.execute(
          `SELECT r.Recipe_code, r.Recipe_name, r.Image, r.details, r.Meal, r.Disease_code, r.Disease_tags
           FROM recipes r
           WHERE (${codeConditions})
           AND r.Recipe_code NOT IN (${recommendedRecipes.map(() => '?').join(',')})
           ORDER BY RAND()
           LIMIT ?`,
          [...diseaseCodes, ...recommendedRecipes.map(r => r.Recipe_code), remainingLimit]
        );
        
        recommendedRecipes = [...recommendedRecipes, ...codeBasedRecipes];
      }
    }

    // วิธีที่ 3: ถ้ายังไม่ครบ ให้เพิ่มสูตรสุ่มจากทั้งหมด
    if (recommendedRecipes.length < parseInt(limit)) {
      const remainingLimit = parseInt(limit) - recommendedRecipes.length;
      const existingIds = recommendedRecipes.map(r => r.Recipe_code);
      
      const [randomRecipes] = await pool.execute(
        `SELECT r.Recipe_code, r.Recipe_name, r.Image, r.details, r.Meal, r.Disease_code, r.Disease_tags
         FROM recipes r
         WHERE r.Recipe_code NOT IN (${existingIds.map(() => '?').join(',')})
         ORDER BY RAND()
         LIMIT ?`,
        [...existingIds, remainingLimit]
      );
      
      recommendedRecipes = [...recommendedRecipes, ...randomRecipes];
    }

    // แปลงข้อมูลให้อยู่ในรูปแบบที่ใช้ได้
    const formattedRecipes = recommendedRecipes.map(recipe => formatRecipe(recipe));

    return res.status(200).json({
      recommendations: formattedRecipes,
      recommendationType: 'personalized',
      userDiseases: userDiseases,
      message: `แนะนำสูตรอาหารสำหรับโรค: ${userDiseases.join(', ')}`
    });

  } catch (err) {
    console.error('GET /api/recommendations error:', err);
    return res.status(500).json({ message: 'DB error', error: err.message });
  }
}

// ฟังก์ชันสำหรับแปลงข้อมูลสูตรอาหาร
function formatRecipe(recipe) {
  // แปลง Disease_tags จาก string เป็น array
  const diseaseTags = recipe?.Disease_tags ? 
    String(recipe.Disease_tags).split(',').map(tag => tag.trim()).filter(Boolean) : [];
  
  // แปลง Meal จาก string เป็น array
  let mealTypesArray = [];
  if (recipe?.Meal) {
    const mealString = String(recipe.Meal);
    if (mealString.startsWith('[') && mealString.endsWith(']')) {
      try {
        const parsedMeals = JSON.parse(mealString);
        if (Array.isArray(parsedMeals)) {
          mealTypesArray = parsedMeals.map(meal => translateMeal(meal)).filter(Boolean);
        }
      } catch (e) {
        mealTypesArray = [];
      }
    } else {
      const meals = mealString.split(',').map(m => m.trim()).filter(Boolean);
      mealTypesArray = meals.map(meal => translateMeal(meal)).filter(Boolean);
    }
  }

  return {
    id: Number(recipe.Recipe_code),
    title: recipe.Recipe_name || 'ไม่ทราบชื่อ',
    image: normalizeImagePath(recipe.Image),
    details: recipe.details || '',
    mealTypes: mealTypesArray,
    diseases: recipe.Disease_code ? [Number(recipe.Disease_code)] : [],
    tags: diseaseTags,
  };
}

// ฟังก์ชันสำหรับแปลงชื่อมื้ออาหาร
function translateMeal(meal) {
  switch ((meal || '').toLowerCase()) {
    case 'breakfast': return 'มื้อเช้า';
    case 'lunch': return 'มื้อกลางวัน';
    case 'dinner': return 'มื้อเย็น';
    case 'snack': return 'ของว่าง';
    case 'dessert': return 'ของหวาน';
    default: return meal || 'ไม่ระบุ';
  }
}

// ฟังก์ชันสำหรับแปลง path รูปภาพ
function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}
