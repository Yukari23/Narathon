// lib/db.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',        // ถ้ามีรหัสผ่านใน XAMPP ให้ใส่ตรงนี้
  database: 'food_recipes',
  waitForConnections: true,
  connectionLimit: 50,  // เพิ่มจาก 10 เป็น 50
  queueLimit: 0
});

export default pool;
