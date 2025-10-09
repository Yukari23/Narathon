// /pages/api/register.js
import pool from '../lib/db';     // ✅ ใช้ connection pool

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'กรอกข้อมูลให้ครบ' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    const emailLc = String(email).trim().toLowerCase();

    // ตรวจซ้ำ
    const [existing] = await pool.execute(
      'SELECT 1 FROM members WHERE Email_member = ? LIMIT 1',
      [emailLc]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้ไปแล้ว' });
    }

    // เพิ่มสมาชิกใหม่ (เก็บรหัสผ่านแบบ plain text)
    const [result] = await pool.execute(
      'INSERT INTO members (Email_member, First_name, Password) VALUES (?, ?, ?)',
      [emailLc, String(name).trim(), password]
    );

    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      id: result.insertId,
      user: { email: emailLc, name: String(name).trim() }
    });
  } catch (err) {
    console.error('POST /api/register error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ', error: err.message });
  }
}
