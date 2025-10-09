// /pages/api/admin-diseases.js
import pool from '../lib/db';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const [rows] = await pool.execute(
        'SELECT Disease_code AS id, Disease_type AS name FROM diseases ORDER BY Disease_type ASC'
      );
      return res.status(200).json({ diseases: rows });
    } catch (error) {
      console.error('GET /api/admin-diseases error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { name, color } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'กรุณาระบุชื่อโรค' });
      }

      const trimmedName = String(name).slice(0, 100);
      const trimmedColor = color ? String(color).slice(0, 7) : '#94a3b8';

      // ตรวจสอบชื่อซ้ำ
      const [existing] = await pool.execute(
        'SELECT Disease_code FROM diseases WHERE Disease_type = ? LIMIT 1',
        [trimmedName]
      );

      if (existing.length > 0) {
        return res.status(409).json({ message: 'โรคนี้มีอยู่แล้วในระบบ' });
      }

      const [result] = await pool.execute(
        'INSERT INTO diseases (Disease_type, Email_member) VALUES (?, ?)',
        [trimmedName, null]
      );

      return res.status(201).json({
        message: 'เพิ่มโรคสำเร็จ',
        disease: {
          id: result.insertId,
          name: trimmedName,
          color: trimmedColor
        }
      });
    } catch (error) {
      console.error('POST /api/admin-diseases error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มโรค', error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, name, color } = req.body;
      
      if (!id || !name || !name.trim()) {
        return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
      }

      const trimmedName = String(name).slice(0, 100);

      // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเอง)
      const [existing] = await pool.execute(
        'SELECT Disease_code FROM diseases WHERE Disease_type = ? AND Disease_code != ? LIMIT 1',
        [trimmedName, id]
      );

      if (existing.length > 0) {
        return res.status(409).json({ message: 'โรคนี้มีอยู่แล้วในระบบ' });
      }

      const [result] = await pool.execute(
        'UPDATE diseases SET Disease_type = ? WHERE Disease_code = ?',
        [trimmedName, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบโรคที่ระบุ' });
      }

      return res.status(200).json({ message: 'อัปเดตโรคสำเร็จ' });
    } catch (error) {
      console.error('PUT /api/admin-diseases error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตโรค', error: error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'กรุณาระบุ ID ของโรค' });
      }

      // ตรวจสอบว่ามีสูตรอาหารใช้โรคนี้หรือไม่
      const [recipesUsingDisease] = await pool.execute(
        'SELECT COUNT(*) as count FROM recipes WHERE Disease_code = ?',
        [id]
      );

      if (recipesUsingDisease[0].count > 0) {
        return res.status(409).json({ 
          message: 'ไม่สามารถลบโรคนี้ได้ เนื่องจากมีสูตรอาหารที่ใช้โรคนี้อยู่' 
        });
      }

      const [result] = await pool.execute(
        'DELETE FROM diseases WHERE Disease_code = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบโรคที่ระบุ' });
      }

      return res.status(200).json({ message: 'ลบโรคสำเร็จ' });
    } catch (error) {
      console.error('DELETE /api/admin-diseases error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบโรค', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
