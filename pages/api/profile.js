// /pages/api/profile.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const email = (req.query.email || '').trim();
    if (!email) return res.status(400).json({ error: 'email is required' });

    const pool = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'food_recipes',
      connectionLimit: 10,
    });

    const [rows] = await pool.query(
      'SELECT * FROM members WHERE Email_member = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }

    return res.status(200).json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'internal error' });
  }
}
