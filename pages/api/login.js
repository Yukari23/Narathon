import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken' // ✅ [เพิ่ม] ใช้สร้าง Token

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email, password } = req.body

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'food_recipes',
    })

    // ✅ ตรวจสอบในตาราง admin
    const [adminRows] = await connection.execute(
      'SELECT Email_Admin, First_name, Password FROM admin WHERE Email_Admin = ?',
      [email]
    )

    if (adminRows.length > 0) {
      const admin = adminRows[0]
      if (admin.Password === password) {
        await connection.end()

        // ✅ [เพิ่ม] สร้าง JWT Token
        const token = jwt.sign(
          { email: admin.Email_Admin, role: 'admin' },
          process.env.JWT_SECRET || 'secret_key', // secret key ควรเก็บใน .env
          { expiresIn: '1h' } // Token หมดอายุใน 1 ชั่วโมง
        )

        return res.status(200).json({
          message: 'เข้าสู่ระบบสำเร็จ',
          token, // ✅ [เพิ่ม] ส่ง token กลับให้ client
          user: {
            email: admin.Email_Admin,
            name: admin.First_name,
            role: 'admin',
          },
        })
      } else {
        await connection.end()
        return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' })
      }
    }

    // ✅ ตรวจสอบใน members
    const [memberRows] = await connection.execute(
      'SELECT Email_member, First_name, Password FROM members WHERE Email_member = ?',
      [email]
    )

    await connection.end()

    if (memberRows.length === 0) {
      return res.status(401).json({ message: 'อีเมลนี้ไม่มีอยู่ในระบบ' })
    }

    const user = memberRows[0]

    if (user.Password !== password) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' })
    }

    // ✅ [เพิ่ม] สร้าง JWT Token สำหรับผู้ใช้ทั่วไป
    const token = jwt.sign(
      { email: user.Email_member, role: 'user' },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    )

    return res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token, // ✅ [เพิ่ม] ส่ง token กลับ
      user: {
        email: user.Email_member,
        name: user.First_name,
        role: 'user',
      },
    })
  } catch (error) {
    console.error('Login error:', error.message)
    return res.status(500).json({ message: `เกิดข้อผิดพลาดในระบบ: ${error.message}` })
  }
}
