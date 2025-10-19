// /pages/api/user-diseases.js
import pool from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Missing email parameter' });
    }

    // ดึงข้อมูลโรคที่ผู้ใช้สนใจ
    const [rows] = await pool.execute(
      `SELECT Disease_tags 
       FROM members 
       WHERE Email_member = ? 
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const diseaseTags = rows[0].Disease_tags || '';
    const diseases = diseaseTags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    return res.status(200).json({
      diseases: diseases,
      hasDiseases: diseases.length > 0
    });

  } catch (err) {
    console.error('GET /api/user-diseases error:', err);
    return res.status(500).json({ message: 'DB error', error: err.message });
  }
}
