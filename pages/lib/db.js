// lib/db.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',        // ถ้ามีรหัสผ่านใน XAMPP ให้ใส่ตรงนี้
  database: 'food_recipes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
