// /pages/api/admin.js
import pool from '../lib/db';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// ปิด bodyParser ของ Next เพื่อใช้ formidable
export const config = { api: { bodyParser: false } };

// ฟังก์ชัน normalize path
function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}

export default async function handler(req, res) {
  // ✅ ดึงข้อมูลแอดมิน
  if (req.method === 'GET') {
    try {
      const [rows] = await pool.execute(
        'SELECT Email_Admin AS email, First_name AS name, Image AS image FROM admin LIMIT 1'
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลแอดมิน' });
      }

      const admin = rows[0];
      return res.status(200).json({
        admin: {
          email: admin.email,
          name: admin.name || 'แอดมิน',
          image: normalizeImagePath(admin.image),
        },
      });
    } catch (err) {
      console.error('GET /api/admin error:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
  }

  // ✅ อัปเดตข้อมูลแอดมิน (ชื่อ, รูป, รหัสผ่าน)
  if (req.method === 'PUT') {
    try {
      const form = formidable({ keepExtensions: true });
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('formidable error:', err);
          return res.status(400).json({ message: 'ไม่สามารถอ่านข้อมูลได้', error: err.message });
        }

        const email = fields.email?.[0];
        const name = fields.name?.[0];
        const newPassword = fields.newPassword?.[0];
        const imageFile = files.image?.[0];

        if (!email) {
          return res.status(400).json({ message: 'ไม่พบอีเมลแอดมิน' });
        }

        let imagePath = null;
        if (imageFile) {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const fileName = Date.now() + '_' + imageFile.originalFilename;
          const newPath = path.join(uploadDir, fileName);
          fs.renameSync(imageFile.filepath, newPath);
          imagePath = '/uploads/' + fileName;
        }

        const updates = [];
        const values = [];

        if (name) {
          updates.push('First_name = ?');
          values.push(name);
        }

        if (newPassword && newPassword.length >= 6) {
          updates.push('Password = ?');
          values.push(newPassword);
        }

        if (imagePath) {
          updates.push('Image = ?');
          values.push(imagePath);
        }

        if (updates.length === 0) {
          return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });
        }

        values.push(email);

        try {
          const [result] = await pool.execute(
            `UPDATE admin SET ${updates.join(', ')} WHERE Email_Admin = ?`,
            values
          );

          if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลแอดมิน' });
          }

          return res.status(200).json({
            message: 'อัปเดตข้อมูลสำเร็จ',
            admin: {
              email,
              name,
              image: imagePath || '/images/GF3.jpg',
            },
          });
        } catch (dbErr) {
          console.error('DB update error:', dbErr);
          return res.status(500).json({ message: 'อัปเดตฐานข้อมูลไม่สำเร็จ', error: dbErr.message });
        }
      });
    } catch (error) {
      console.error('PUT /api/admin error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ', error: error.message });
    }
  }

  // ❌ ไม่รองรับ method อื่น
  else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
