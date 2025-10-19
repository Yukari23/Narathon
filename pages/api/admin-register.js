// /pages/api/admin-register.js
import pool from '../lib/db';
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

      const email = fields.email?.[0];
      const name = fields.name?.[0];
      const password = fields.password?.[0];
      const imageFile = files.image?.[0];

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!email || !name || !password) {
        return res.status(400).json({ 
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, ชื่อ, รหัสผ่าน)' 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' 
        });
      }

      // ตรวจสอบรูปแบบอีเมล
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'รูปแบบอีเมลไม่ถูกต้อง' 
        });
      }

      // ตรวจสอบว่าอีเมลมีอยู่แล้วหรือไม่
      const [existingRows] = await pool.execute(
        'SELECT Email_Admin FROM admin WHERE Email_Admin = ?',
        [email.toLowerCase()]
      );

      if (existingRows.length > 0) {
        return res.status(409).json({ 
          message: 'อีเมลนี้ถูกใช้ไปแล้ว' 
        });
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

      // เพิ่มแอดมินใหม่
      const [result] = await pool.execute(
        'INSERT INTO admin (Email_Admin, First_name, Image, Password) VALUES (?, ?, ?, ?)',
        [email.toLowerCase(), name.trim(), imagePath, password]
      );

      return res.status(201).json({
        message: 'เพิ่มแอดมินสำเร็จ',
        admin: {
          id: result.insertId,
          email: email.toLowerCase(),
          name: name.trim(),
          image: imagePath
        }
      });
    });
  } catch (error) {
    console.error('POST /api/admin-register error:', error);
    return res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในระบบ', 
      error: error.message 
    });
  }
}
