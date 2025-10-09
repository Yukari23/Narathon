// /pages/api/reset-password.js
import pool from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    // ตรวจสอบ OTP ใน members
    const [members] = await pool.execute(
      'SELECT Email_member FROM members WHERE Email_member = ? AND OTP = ? LIMIT 1',
      [trimmedEmail, trimmedOtp]
    );

    if (members.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
    }

    // อัปเดตรหัสผ่านใหม่และลบ OTP
    await pool.execute(
      'UPDATE members SET Password = ?, OTP = NULL WHERE Email_member = ?',
      [newPassword, trimmedEmail]
    );

    return res.status(200).json({ 
      message: 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่ กรุณาลองใหม่อีกครั้ง' 
    });
  }
}
