// /pages/api/admin-users.js
import pool from '../lib/db';

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
    try {
      const [rows] = await pool.execute(`
        SELECT 
          First_name AS name,
          Email_member AS email,
          Image AS image,
          Disease_tags AS diseaseTags,
          OTP AS otp
        FROM members
        ORDER BY Email_member DESC
      `);

      const processedUsers = rows.map(user => ({
        ...user,
        image: normalizeImagePath(user.image),
        diseaseTags: (user.diseaseTags || '').split(',').map(t => t.trim()).filter(Boolean)
      }));

      return res.status(200).json({ users: processedUsers });
    } catch (error) {
      console.error('GET /api/admin-users error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { email, name, diseaseTags, isActive } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'กรุณาระบุอีเมล' });
      }

      const updates = [];
      const values = [];

      if (name && name.trim()) {
        updates.push('First_name = ?');
        values.push(name.trim());
      }

      if (diseaseTags !== undefined) {
        const tagsString = Array.isArray(diseaseTags) ? diseaseTags.join(',') : diseaseTags;
        updates.push('Disease_tags = ?');
        values.push(tagsString);
      }

      if (isActive !== undefined) {
        updates.push('OTP = ?');
        values.push(isActive ? null : 'DISABLED');
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });
      }

      values.push(email);

      const [result] = await pool.execute(
        `UPDATE members SET ${updates.join(', ')} WHERE Email_member = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่ระบุ' });
      }

      return res.status(200).json({ message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
    } catch (error) {
      console.error('PUT /api/admin-users error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้', error: error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: 'กรุณาระบุอีเมลของผู้ใช้' });
      }

      // ลบข้อมูลที่เกี่ยวข้องก่อน
      await pool.execute('DELETE FROM comments WHERE Member_email = ?', [email]);
      await pool.execute('DELETE FROM bookmarks WHERE Member_email = ?', [email]);
      
      // ลบผู้ใช้
      const [result] = await pool.execute(
        'DELETE FROM members WHERE Email_member = ?',
        [email]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่ระบุ' });
      }

      return res.status(200).json({ message: 'ลบผู้ใช้สำเร็จ' });
    } catch (error) {
      console.error('DELETE /api/admin-users error:', error);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
