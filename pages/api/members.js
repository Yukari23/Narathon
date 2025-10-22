// /pages/api/members.js
import pool from '../lib/db';         // 🔧 ปรับ path ตามที่วาง lib/db.js จริง

function normalizeImagePath(p) {
  if (!p) return '/images/GF3.jpg';
  const isHttp = /^https?:\/\//i.test(p);
  if (isHttp) return p;
  let img = String(p).replace(/^\/?public\//, '/');
  if (!img.startsWith('/')) img = '/' + img;
  return img;
}

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'Missing email' });

    try {
      const [rows] = await pool.execute(
        `
        SELECT 
          First_name        AS name,
          Email_member      AS email,
          Image             AS image,
          Disease_tags      AS diseaseTags,
          OTP               AS otp
        FROM members
        WHERE Email_member = ?
        LIMIT 1
        `,
        [email]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Member not found' });
      }

      const member = rows[0];

      // ทำความสะอาด path รูปภาพ
      member.image = normalizeImagePath(member.image);

      // แปลง Disease_tags เป็น array
      const tags = (member.diseaseTags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      return res.status(200).json({
        member: {
          name: member.name,
          email: member.email,
          image: member.image,
          diseaseTags: tags,
          otp: member.otp || '',
        },
      });
    } catch (err) {
      console.error('GET /api/members error:', err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
  }

  if (method === 'PUT') {
    const { email, name, password, image, diseaseTags, otp } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Missing email' });

    try {
      const updateFields = [];
      const updateValues = [];

      if (name) {
        updateFields.push('First_name = ?');
        updateValues.push(String(name).trim());
      }

      if (typeof image === 'string' && image.trim() !== '') {
        updateFields.push('Image = ?');
        updateValues.push(image.trim());
      }

      if (password) {
        if (String(password).length < 6) {
          return res.status(400).json({ message: 'Password ควรยาวอย่างน้อย 6 อักขระ' });
        }
        // เก็บรหัสผ่านแบบ plain text
        updateFields.push('Password = ?');
        updateValues.push(password);
      }

      if (diseaseTags !== undefined) {
        // รองรับทั้ง array และ string
        const tagsString = Array.isArray(diseaseTags) 
          ? diseaseTags.join(',') 
          : String(diseaseTags || '');
        updateFields.push('Disease_tags = ?');
        updateValues.push(tagsString);
      }

      if (otp !== undefined) {
        updateFields.push('OTP = ?');
        updateValues.push(String(otp || '').trim());
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      updateValues.push(email);

      const [result] = await pool.execute(
        `UPDATE members SET ${updateFields.join(', ')} WHERE Email_member = ?`,
        updateValues
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // ดึงข้อมูลล่าสุดกลับไปให้ UI อัปเดต
      const [rows2] = await pool.execute(
        `
        SELECT 
          First_name   AS name,
          Email_member AS email,
          Image        AS image,
          Disease_tags AS diseaseTags,
          OTP          AS otp
        FROM members
        WHERE Email_member = ?
        LIMIT 1
        `,
        [email]
      );

      const updated = rows2[0] || {};
      updated.image = normalizeImagePath(updated.image);
      const tags = (updated.diseaseTags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      return res.status(200).json({
        message: 'Profile updated successfully',
        member: {
          name: updated.name || '',
          email: updated.email || email,
          image: updated.image,
          diseaseTags: tags,
          otp: updated.otp || ''
        }
      });
    } catch (err) {
      console.error('PUT /api/members error:', err);
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
  }

  if (method === 'POST') {
    const { email, name, password, image, diseaseTags, otp } = req.body || {};
    
    if (!email || !name || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, name, password' 
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ 
        message: 'Password ควรยาวอย่างน้อย 6 อักขระ' 
      });
    }

    try {
      // ตรวจสอบว่าอีเมลมีอยู่แล้วหรือไม่
      const [existingRows] = await pool.execute(
        'SELECT Email_member FROM members WHERE Email_member = ?',
        [email]
      );

      if (existingRows.length > 0) {
        return res.status(409).json({ 
          message: 'Email already exists' 
        });
      }

      // สร้างสมาชิกใหม่ (เก็บรหัสผ่านแบบ plain text)
      const [result] = await pool.execute(
        `INSERT INTO members 
         (Email_member, First_name, Password, Image, Disease_tags, OTP) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          email,
          String(name).trim(),
          password, // เก็บรหัสผ่านแบบ plain text
          image ? String(image).trim() : null,
          Array.isArray(diseaseTags) ? diseaseTags.join(',') : (diseaseTags || ''),
          otp ? String(otp).trim() : ''
        ]
      );

      return res.status(201).json({
        message: 'Member created successfully',
        memberId: result.insertId
      });
    } catch (err) {
      console.error('POST /api/members error:', err);
      return res.status(500).json({ 
        message: 'DB error', 
        error: err.message 
      });
    }
  }

  if (method === 'DELETE') {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Missing email parameter' 
      });
    }

    try {
      const [result] = await pool.execute(
        'DELETE FROM members WHERE Email_member = ?',
        [email]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          message: 'Member not found' 
        });
      }

      return res.status(200).json({
        message: 'Member deleted successfully'
      });
    } catch (err) {
      console.error('DELETE /api/members error:', err);
      return res.status(500).json({ 
        message: 'DB error', 
        error: err.message 
      });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}