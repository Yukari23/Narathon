// /pages/api/verify-otp.js
import pool from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = String(otp).trim();

    // ตรวจใน members (ตามโครงสร้างที่คุณใช้อยู่)
    const [rows] = await pool.execute(
      'SELECT Email_member FROM members WHERE Email_member = ? AND OTP = ? LIMIT 1',
      [trimmedEmail, trimmedOtp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' });
    }

    // ไม่ลบ OTP ที่ DB ในขั้นตอนตรวจสอบนี้
    // จะลบทิ้งตอน reset password สำเร็จใน /api/reset-password
    return res.status(200).json({ message: 'ยืนยัน OTP สำเร็จ' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' });
  }
}
