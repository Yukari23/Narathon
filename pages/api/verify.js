import jwt from 'jsonwebtoken'

export default function handler(req, res) {
  const { token } = req.body
  if (!token) return res.status(401).json({ valid: false, message: 'ไม่มี Token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key')
    res.status(200).json({ valid: true, user: decoded })
  } catch (err) {
    res.status(401).json({ valid: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}
