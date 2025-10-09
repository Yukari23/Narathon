// /pages/api/forgot-password.js
import pool from '../lib/db';
import nodemailer from 'nodemailer'; // <--- 1. นำเข้า Nodemailer

// 2. สร้าง Transporter ด้วย Environment Variables
// ต้องกำหนด EMAIL_USER และ EMAIL_PASS (App Password) ในไฟล์ .env.local
const transporter = nodemailer.createTransport({
  service: 'gmail', // ใช้ service: 'gmail' หรือระบุ host/port ของ SMTP อื่นๆ
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกอีเมล' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // ตรวจสอบว่าอีเมลมีอยู่ในระบบหรือไม่
    const [members] = await pool.execute(
      'SELECT Email_member FROM members WHERE Email_member = ? LIMIT 1',
      [trimmedEmail]
    );

    const [admins] = await pool.execute(
      'SELECT Email_Admin FROM admin WHERE Email_Admin = ? LIMIT 1',
      [trimmedEmail]
    );

    if (members.length === 0 && admins.length === 0) {
      // ไม่บอกว่าไม่พบอีเมล เพื่อความปลอดภัย
      return res.status(200).json({ 
        message: 'หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับรหัส OTP สำหรับตั้งรหัสผ่านใหม่' 
      });
    }

    // สร้างรหัส OTP แบบง่าย (6 หลัก)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // เก็บ OTP ไว้ในฐานข้อมูล (สำหรับ members)
    if (members.length > 0) {
      await pool.execute(
        'UPDATE members SET OTP = ? WHERE Email_member = ?',
        [otp, trimmedEmail]
      );
    }
    
    // 3. กำหนดรายละเอียดอีเมล OTP
    const mailOptions = {
      from: process.env.EMAIL_USER, // อีเมลผู้ส่ง (ควรตรงกับ user ใน transporter)
      to: trimmedEmail, // อีเมลผู้รับ
      subject: 'รหัส OTP สำหรับการตั้งรหัสผ่านใหม่',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #007bff;">รหัสยืนยัน (OTP)</h2>
          <p>คุณได้ขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ รหัสยืนยันของคุณคือ:</p>
          <p style="font-size: 32px; font-weight: bold; color: #fff; background-color: #28a745; padding: 15px 25px; display: inline-block; border-radius: 4px; letter-spacing: 5px;">${otp}</p>
          <p>โปรดใช้รหัสนี้ในหน้าตั้งรหัสผ่านใหม่เพื่อดำเนินการต่อ</p>
          <p style="color: #6c757d; font-size: 12px;">รหัสนี้จะใช้ได้ในช่วงเวลาจำกัด หากคุณไม่ได้ร้องขอการตั้งรหัสผ่านใหม่ โปรดละเลยอีเมลนี้</p>
        </div>
      `,
      text: `รหัสยืนยัน (OTP) สำหรับการตั้งรหัสผ่านใหม่ของคุณคือ: ${otp}`
    };

    // 4. ส่งอีเมล
    await transporter.sendMail(mailOptions);
    
    // console.log(`OTP for ${trimmedEmail}: ${otp}`); // ลบ log

    return res.status(200).json({ 
      message: 'รหัส OTP ถูกส่งไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมล',
    });

  } catch (error) {
    // หากส่งอีเมลไม่สำเร็จ ควรแจ้งให้ผู้ใช้ทราบ
    console.error('Forgot password error:', error);
    return res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการส่งรหัส OTP กรุณาลองใหม่อีกครั้ง' 
    });
  }
}