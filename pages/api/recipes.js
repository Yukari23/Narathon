// /pages/api/recipes.js
import pool from '../lib/db';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const [rows] = await pool.execute(
        'SELECT Recipe_code, Recipe_name, Image, details, Meal, Disease_tags, Disease_code, raw_material, method FROM recipes ORDER BY Recipe_code DESC'
      );
      
      
      return res.status(200).json({ recipes: rows });
    } catch (error) {
      console.error('GET /api/recipes error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', error: error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'ต้องระบุ ID ของสูตรอาหาร' });
      }

      // ลบความเห็น/บุ๊กมาร์กที่เกี่ยวข้องก่อน
      await pool.execute('DELETE FROM comments WHERE Recipe_code = ?', [id]);
      await pool.execute('DELETE FROM bookmarks WHERE Recipe_code = ?', [id]);

      const [result] = await pool.execute('DELETE FROM recipes WHERE Recipe_code = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบสูตรอาหารที่ระบุ' });
      }

      return res.status(200).json({ message: 'ลบสูตรอาหารสำเร็จ' });
    } catch (error) {
      console.error('DELETE /api/recipes error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบสูตรอาหาร', error: error.message });
    }
  }

  // ✅ JSON PUT: ใช้โดยหน้า AdminDashboard
  if (method === 'PUT') {
    try {
      const {
        id,              // Recipe_code
        title,           // -> Recipe_name
        description,     // -> details
        image,           // -> Image (URL)
        diseaseTags,     // -> Disease_tags (comma text)
        diseaseCode,     // -> Disease_code (number/string)
        meal,            // -> Meal ('breakfast'|'lunch'|'dinner' หรือ '1'|'2'|'3')
        ingredients,     // -> raw_material (array/string)
        steps            // -> method (array/string)
      } = req.body;

      if (!id) {
        return res.status(400).json({ message: 'ต้องระบุ ID ของสูตรอาหาร' });
      }

      const mealMap = { '1': 'breakfast', '2': 'lunch', '3': 'dinner' };
      const finalMeal = mealMap?.[meal] || meal || null;

      const updateFields = [];
      const updateValues = [];

      if (title != null) {
        updateFields.push('Recipe_name = ?');
        updateValues.push(title);
      }
      if (description != null) {
        updateFields.push('details = ?');
        updateValues.push(description);
      }
      if (image != null) {
        updateFields.push('Image = ?');
        updateValues.push(image);
      }
      if (diseaseTags != null) {
        updateFields.push('Disease_tags = ?');
        updateValues.push(Array.isArray(diseaseTags) ? diseaseTags.join(',') : diseaseTags);
      }
      if (diseaseCode != null) {
        updateFields.push('Disease_code = ?');
        updateValues.push(diseaseCode || null);
      }
      if (finalMeal != null) {
        updateFields.push('Meal = ?');
        updateValues.push(finalMeal);
      }
      if (ingredients != null) {
        updateFields.push('raw_material = ?');
        updateValues.push(Array.isArray(ingredients) ? JSON.stringify(ingredients) : String(ingredients));
      }
      if (steps != null) {
        updateFields.push('method = ?');
        updateValues.push(Array.isArray(steps) ? JSON.stringify(steps) : String(steps));
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

      return res.status(200).json({ message: 'อัปเดตสูตรอาหารสำเร็จ' });
    } catch (error) {
      console.error('PUT /api/recipes error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสูตรอาหาร', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
