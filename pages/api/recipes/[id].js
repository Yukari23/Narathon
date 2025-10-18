// /pages/api/recipes/[id].js
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';
import pool from '../../lib/db';

export const config = { api: { bodyParser: false } };

function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

function webPathFromFs(filePath) {
  // แปลงเป็นเส้นทางที่เสิร์ฟได้ เช่น /uploads/xxx.jpg
  const rel = '/' + path
    .relative(path.join(process.cwd(), 'public'), filePath)
    .replace(/\\+/g, '/')
    .replace(/^\/?public\//, '');
  return rel.startsWith('/') ? rel : '/' + rel;
}

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'ต้องระบุ ID ของสูตรอาหาร' });
  }

  if (method === 'GET') {
    try {
      const [rows] = await pool.execute(
        `SELECT Recipe_code, Recipe_name, Image, details, Meal, Disease_tags, Disease_code, raw_material, method
         FROM recipes WHERE Recipe_code = ? LIMIT 1`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบสูตรอาหารที่ระบุ' });
      }
      return res.status(200).json({ recipe: rows[0] });
    } catch (error) {
      console.error('GET /api/recipes/[id] error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', error: error.message });
    }
  }

  if (method === 'PUT') {
    // รองรับ multipart/form-data จากหน้า EditRecipe เดิม
    try {
      ensureUploadDir();

      const form = formidable({
        uploadDir: path.join(process.cwd(), 'public', 'uploads'),
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        filter: part => part.mimetype ? part.mimetype.startsWith('image/') || part.name !== 'Image' : true
      });

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      // ดึงค่าจาก fields (มาจากหน้าฟอร์มของคุณ)
      const Recipe_name = (fields.Recipe_name?.[0] ?? fields.Recipe_name ?? '').toString();
      const details = (fields.details?.[0] ?? fields.details ?? '').toString();

      // meal: รองรับหลายมื้อ (คั่นด้วยจุลภาค)
      const mealRaw = (fields.Meal?.[0] ?? fields.Meal ?? '').toString().trim();
      let Meal = null;
      
      if (mealRaw) {
        // ถ้าเป็น string คั่นด้วยจุลภาค (เช่น "breakfast,lunch,dinner")
        if (mealRaw.includes(',')) {
          Meal = mealRaw; // เก็บเป็น string คั่นด้วยจุลภาค
        } else {
          // ถ้าเป็นมื้อเดียว
          const mealMap = { '1': 'breakfast', '2': 'lunch', '3': 'dinner' };
          Meal = mealMap[mealRaw] || mealRaw || null;
        }
      }

      const methodField = (fields.method?.[0] ?? fields.method ?? '');
      const rawField = (fields.raw_material?.[0] ?? fields.raw_material ?? '');
      const Disease_tags = (fields.Disease_tags?.[0] ?? fields.Disease_tags ?? '').toString();
      const Disease_code = (fields.Disease_code?.[0] ?? fields.Disease_code ?? null);

      // Debug: แสดงข้อมูลที่รับมา
      console.log('API received data:');
      console.log('- Recipe_name:', Recipe_name);
      console.log('- details:', details);
      console.log('- Meal (raw):', mealRaw);
      console.log('- Meal (processed):', Meal);
      console.log('- Disease_tags:', Disease_tags);
      console.log('- Disease_code:', Disease_code);

      // รูปภาพ (ถ้ามี)
      let Image = null;
      const fileObj = Array.isArray(files.Image) ? files.Image[0] : files.Image;
      if (fileObj && (fileObj.filepath || fileObj.path)) {
        Image = webPathFromFs(fileObj.filepath || fileObj.path);
      }

      // เตรียมค่าอัปเดต
      const updateFields = [];
      const updateValues = [];

      if (Recipe_name !== '') {
        updateFields.push('Recipe_name = ?');
        updateValues.push(Recipe_name);
      }
      if (details !== '') {
        updateFields.push('details = ?');
        updateValues.push(details);
      }
      if (Meal !== null) {
        updateFields.push('Meal = ?');
        updateValues.push(Meal);
      }
      if (methodField !== '') {
        // จากฟอร์มส่งมาเป็น JSON string อยู่แล้ว
        updateFields.push('method = ?');
        updateValues.push(methodField.toString());
      }
      if (rawField !== '') {
        updateFields.push('raw_material = ?');
        updateValues.push(rawField.toString());
      }
      if (Disease_tags !== '') {
        updateFields.push('Disease_tags = ?');
        updateValues.push(Disease_tags);
      }
      if (Disease_code !== null && Disease_code !== '') {
        updateFields.push('Disease_code = ?');
        updateValues.push(Disease_code);
      }
      if (Image) {
        updateFields.push('Image = ?');
        updateValues.push(Image);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });
      }

      updateValues.push(id);

      const [result] = await pool.execute(
        `UPDATE recipes SET ${updateFields.join(', ')} WHERE Recipe_code = ?`,
        updateValues
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบสูตรอาหารที่ระบุ' });
      }

      return res.status(200).json({ message: 'อัปเดตสูตรอาหารสำเร็จ', image: Image });
    } catch (error) {
      console.error('PUT /api/recipes/[id] error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสูตรอาหาร', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
