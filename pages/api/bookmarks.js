// /pages/api/bookmarks.js
// ✅ ถ้า lib/db.js อยู่ที่รากโปรเจกต์ ให้ใช้พาธนี้
import pool from '../lib/db';

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function normalizeImagePath(img) {
  if (!img) return '/images/default-recipe.jpg';
  const isHttp = /^https?:\/\//i.test(img);
  if (isHttp) return img.trim();
  let p = String(img).replace(/^\/?public\//, '/');
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

function splitTags(s) {
  return String(s || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function mealIdToName(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '1' || s === 'breakfast') return 'มื้อเช้า';
  if (s === '2' || s === 'lunch')     return 'มื้อกลางวัน';
  if (s === '3' || s === 'dinner')    return 'มื้อเย็น';
  return s || 'ไม่ระบุ';
}

export default async function handler(req, res) {
  // ---------- GET ----------
  if (req.method === 'GET') {
    const email = (req.query.email || '').toString().trim();
    const recipeId = toInt(req.query.recipeId, NaN);
    const disease = (req.query.disease || '').toString().trim();

    if (!email) {
      return res.status(400).json({ message: 'ต้องมีพารามิเตอร์ email' });
    }

    // 1) ตรวจว่าบุ๊กมาร์กไว้หรือยัง (ใช้ในหน้า recipe detail)
    if (Number.isFinite(recipeId)) {
      try {
        const [rows] = await pool.execute(
          'SELECT 1 FROM bookmarks WHERE Member_email = ? AND Recipe_code = ? LIMIT 1',
          [email, recipeId]
        );
        return res.status(200).json({ bookmarked: rows.length > 0 });
      } catch (err) {
        console.error('GET check bookmark error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    // 2) กรองตามโรค → ดึงเฉพาะแถวจาก "bookmarks ของอีเมลนั้น" แล้วค่อยจับคู่โรค
    if (disease !== '') {
      try {
        const like = `%${disease}%`;
        const [rows] = await pool.execute(
          `
          SELECT 
            r.Recipe_code      AS id,
            r.Recipe_name      AS name,
            r.Image            AS image,
            r.Disease_tags     AS disease_tags,
            r.Disease_code     AS disease_code,
            d.Disease_type     AS disease_name,
            r.Meal             AS meal
          FROM bookmarks b
          JOIN recipes r        ON r.Recipe_code = b.Recipe_code
          LEFT JOIN diseases d  ON d.Disease_code = r.Disease_code
          WHERE b.Member_email = ?
            AND (
              (r.Disease_tags IS NOT NULL AND r.Disease_tags <> '' AND r.Disease_tags LIKE ?)
              OR (d.Disease_type IS NOT NULL AND d.Disease_type LIKE ?)
            )
          ORDER BY b.Bookmark_ID DESC
          `,
          [email, like, like]
        );

        const recipes = rows.map(r => {
          const tags = new Set(splitTags(r.disease_tags));
          if (r.disease_name) tags.add(r.disease_name);
          return {
            id: Number(r.id),
            name: r.name || 'ไม่ทราบชื่อ',
            image: normalizeImagePath(r.image),
            diseaseTags: Array.from(tags),
            mealName: mealIdToName(r.meal),
          };
        });

        return res.status(200).json({ recipes });
      } catch (err) {
        console.error('GET bookmarks by disease error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    // 3) โหมด "ทั้งหมด" → คืน { items, total, page, limit } และใส่ mealName + diseaseTags ให้ครบ
    const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 100);
    const page = Math.max(toInt(req.query.page, 1), 1);
    const offset = (page - 1) * limit;

    try {
      const [[{ total }]] = await pool.execute(
        'SELECT COUNT(*) AS total FROM bookmarks WHERE Member_email = ?',
        [email]
      );

      const [rows] = await pool.execute(
        `
        SELECT 
          b.Bookmark_ID     AS id,
          b.Member_email    AS email,
          b.Recipe_code     AS recipeId,
          r.Recipe_name     AS title,
          r.Image           AS image,
          r.Meal            AS meal,
          r.Disease_tags    AS disease_tags,
          d.Disease_type    AS disease_name
        FROM bookmarks b
        JOIN recipes r       ON r.Recipe_code = b.Recipe_code
        LEFT JOIN diseases d ON d.Disease_code = r.Disease_code
        WHERE b.Member_email = ?
        ORDER BY b.Bookmark_ID DESC
        LIMIT ? OFFSET ?
        `,
        [email, limit, offset]
      );

      const items = rows.map(r => {
        const tags = new Set(splitTags(r.disease_tags));
        if (r.disease_name) tags.add(r.disease_name);
        return {
          ...r,
          image: normalizeImagePath(r.image),
          mealName: mealIdToName(r.meal),
          diseaseTags: Array.from(tags),
        };
      });

      return res.status(200).json({ items, total, page, limit });
    } catch (err) {
      console.error('GET list bookmarks error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // ---------- POST (เพิ่มบุ๊กมาร์ก) ----------
  if (req.method === 'POST') {
    try {
      const email = (req.body?.email || '').toString().trim();
      const recipeId = toInt(req.body?.recipeId, NaN);
      if (!email || !Number.isFinite(recipeId)) {
        return res.status(400).json({ message: 'ข้อมูลไม่ครบ (ต้องมี email และ recipeId แบบตัวเลข)' });
      }

      await pool.execute(
        'INSERT IGNORE INTO bookmarks (Member_email, Recipe_code) VALUES (?, ?)',
        [email, recipeId]
      );

      const [[row]] = await pool.execute(
        'SELECT Bookmark_ID AS id FROM bookmarks WHERE Member_email = ? AND Recipe_code = ? LIMIT 1',
        [email, recipeId]
      );

      return res.status(201).json({ message: 'บันทึกแล้ว', bookmarked: !!row, id: row?.id || null });
    } catch (err) {
      console.error('POST bookmark error:', err);
      if (err?.code === 'ER_NO_REFERENCED_ROW' || err?.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ message: 'สูตรอาหารนี้ไม่มีอยู่ในระบบ หรือผิด Foreign Key' });
      }
      return res.status(500).json({ message: 'ไม่สามารถบันทึกบุ๊กมาร์กได้' });
    }
  }

  // ---------- DELETE (ลบบุ๊กมาร์ก) ----------
  if (req.method === 'DELETE') {
    try {
      const email = (req.body?.email ?? req.query?.email ?? '').toString().trim();
      const recipeId = toInt(req.body?.recipeId ?? req.query?.recipeId, NaN);
      if (!email || !Number.isFinite(recipeId)) {
        return res.status(400).json({ message: 'ข้อมูลไม่ครบ (ต้องมี email และ recipeId แบบตัวเลข)' });
      }

      const [result] = await pool.execute(
        'DELETE FROM bookmarks WHERE Member_email = ? AND Recipe_code = ?',
        [email, recipeId]
      );

      return res.status(200).json({ message: 'ยกเลิกบันทึกแล้ว', removed: result.affectedRows > 0 });
    } catch (err) {
      console.error('DELETE bookmark error:', err);
      return res.status(500).json({ message: 'ไม่สามารถยกเลิกบันทึกได้' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
