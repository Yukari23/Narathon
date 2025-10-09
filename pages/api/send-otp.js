import nodemailer from 'nodemailer';

// สร้าง transporter ใช้ค่าจาก .env.local
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Missing email or otp' });
  }

  try {
    const mailOptions = {
      from: `"FoodCare Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔑 รหัส OTP สำหรับรีเซ็ตรหัสผ่าน',
      html: `
        <div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:8px;">
          <h2>รหัส OTP ของคุณคือ</h2>
          <p style="font-size:24px; font-weight:bold; color:#3b82f6;">${otp}</p>
          <p>นำรหัสนี้ไปกรอกเพื่อยืนยันการตั้งรหัสผ่านใหม่ ระบบจะหมดอายุใน 5 นาที</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'ส่ง OTP ไปที่อีเมลสำเร็จ' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ message: 'ไม่สามารถส่งอีเมลได้' });
  }
}
