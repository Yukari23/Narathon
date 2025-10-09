import pool from '../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const [rows] = await pool.execute(
        'SELECT Disease_code AS id, Disease_type AS name FROM diseases ORDER BY Disease_type ASC'
      );
      return res.status(200).json({ diseases: rows });
    }

    if (req.method === 'POST') {
      const { name, email } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'กรุณาระบุชื่อแท็กโรค' });
      }

      const trimmedName = String(name).slice(0, 100);
      const trimmedEmail = email ? String(email).slice(0, 50) : null;

      // ตรวจชื่อซ้ำแบบง่าย
      const [dup] = await pool.execute(
        'SELECT Disease_code FROM diseases WHERE Disease_type = ? LIMIT 1',
        [trimmedName]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: 'แท็กโรคนี้มีอยู่แล้ว' });
      }

      const [result] = await pool.execute(
        'INSERT INTO diseases (Disease_type, Email_member) VALUES (?, ?)',
        [trimmedName, trimmedEmail]
      );

      return res.status(201).json({ id: result.insertId, name: trimmedName });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', code: err.code, error: err.sqlMessage || err.message });
  }
}

