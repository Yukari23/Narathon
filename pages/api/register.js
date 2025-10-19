// /pages/api/register.js
import pool from '../lib/db';     // ✅ ใช้ connection pool
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// ปิด bodyParser ของ Next เพื่อใช้ formidable
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = formidable({ keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('formidable error:', err);
        return res.status(400).json({ message: 'ไม่สามารถอ่านข้อมูลได้', error: err.message });
      }

      const name = fields.name?.[0];
      const email = fields.email?.[0];
      const password = fields.password?.[0];
      const imageFile = files.image?.[0];

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

        // จัดการรูปภาพ
        let imagePath = '/images/GF3.jpg'; // รูปเริ่มต้น
        if (imageFile) {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const fileName = Date.now() + '_' + imageFile.originalFilename;
          const newPath = path.join(uploadDir, fileName);
          fs.renameSync(imageFile.filepath, newPath);
          imagePath = '/uploads/' + fileName;
        }

        // เพิ่มสมาชิกใหม่ (เก็บรหัสผ่านแบบ plain text)
        const [result] = await pool.execute(
          'INSERT INTO members (Email_member, First_name, Password, Image) VALUES (?, ?, ?, ?)',
          [emailLc, String(name).trim(), password, imagePath]
        );

        return res.status(201).json({
          message: 'สมัครสมาชิกสำเร็จ',
          id: result.insertId,
          user: { email: emailLc, name: String(name).trim(), image: imagePath }
        });
      } catch (err) {
        console.error('POST /api/register error:', err);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ', error: err.message });
      }
    });
  } catch (error) {
    console.error('Form parsing error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล', error: error.message });
  }
}
