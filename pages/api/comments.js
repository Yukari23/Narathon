// /pages/api/comments.js (หรือไฟล์ตามที่คุณใช้)
import pool from '../lib/db';

export default async function handler(req, res) {
  // ---------- Helpers ----------
  const toInt = (v, def = 0) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  };

  // ดึงอีเมลผู้เรียกใช้งานจาก header หรือ body/query (เผื่อฝั่ง client ส่งมาแบบไหนก็ได้)
  const getActorEmail = (req) => {
    return (
      req.headers['x-user-email'] ||
      req.body?.actorEmail ||
      req.body?.memberEmail || // fallback จากของเดิม
      req.query?.actorEmail ||
      ''
    );
  };

  // ตรวจว่าเป็นแอดมินหรือไม่
  const isAdmin = async (email) => {
    if (!email) return false;
    try {
      const [rows] = await pool.execute(
        'SELECT 1 FROM admin WHERE Email_Admin = ? LIMIT 1',
        [email]
      );
      return rows.length > 0;
    } catch (e) {
      console.error('isAdmin error:', e);
      return false;
    }
  };

  // ตรวจว่าเป็นเจ้าของคอมเมนต์หรือไม่
  const isOwnerOfComment = async (commentId, email) => {
    if (!email || !Number.isFinite(commentId)) return false;
    try {
      const [rows] = await pool.execute(
        'SELECT Member_email FROM comments WHERE Comment_ID = ?',
        [commentId]
      );
      if (rows.length === 0) return false;
      return String(rows[0].Member_email || '').toLowerCase() === String(email).toLowerCase();
    } catch (e) {
      console.error('isOwnerOfComment error:', e);
      return false;
    }
  };

  // สิทธิ์ที่อนุญาตให้แก้ไข/ลบ: เป็นแอดมิน หรือ เป็นเจ้าของคอมเมนต์
  const canModifyComment = async (commentId, email) => {
    const admin = await isAdmin(email);
    if (admin) return true;
    return isOwnerOfComment(commentId, email);
  };

  // เติม authorName/Image/userType ให้คอมเมนต์ 1 รายการ
  const hydrateAuthor = async (comment) => {
    let authorName = '';
    let authorImage = '/images/GF3.jpg';
    let userType = 'member';
    try {
      const [adminRows] = await pool.execute(
        'SELECT First_name FROM admin WHERE Email_Admin = ?',
        [comment.memberEmail]
      );
      if (adminRows.length > 0) {
        authorName = adminRows[0].First_name || 'แอดมิน';
        userType = 'admin';
      } else {
        const [memberRows] = await pool.execute(
          'SELECT First_name, Image FROM members WHERE Email_member = ?',
          [comment.memberEmail]
        );
        if (memberRows.length > 0) {
          authorName = memberRows[0].First_name || '';
          authorImage = memberRows[0].Image || '/images/GF3.jpg';
        }
      }
    } catch (error) {
      console.error('hydrateAuthor error:', error);
    }
    return {
      ...comment,
      authorName:
        authorName ||
        (comment.memberEmail ? String(comment.memberEmail).split('@')[0] : null),
      authorImage,
      userType,
    };
  };

  // ---------- GET: list comments ----------
  if (req.method === 'GET') {
    try {
      const recipeId = toInt(req.query.recipeId, NaN);
      if (!Number.isFinite(recipeId)) {
        return res.status(400).json({ message: 'ต้องมี recipeId (ตัวเลข)' });
      }

      const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 100);
      const page = Math.max(toInt(req.query.page, 1), 1);
      const offset = (page - 1) * limit;

      const [commentRows] = await pool.execute(
        `SELECT 
           Comment_ID      AS id,
           \`Date\`         AS date,
           Comment_content AS body,
           Recipe_code     AS recipeId,
           Member_email    AS memberEmail
         FROM comments
         WHERE Recipe_code = ?
         ORDER BY \`Date\` DESC, Comment_ID DESC
         LIMIT ? OFFSET ?`,
        [recipeId, limit, offset]
      );

      const comments = await Promise.all(commentRows.map(hydrateAuthor));
      return res.status(200).json({ comments, page, limit });
    } catch (e) {
      console.error('GET comments error:', e);
      console.error('Error details:', {
        message: e.message,
        code: e.code,
        errno: e.errno,
        sqlState: e.sqlState,
        sqlMessage: e.sqlMessage,
      });
      return res.status(500).json({
        message: 'Server error',
        error:
          process.env.NODE_ENV === 'development'
            ? e.message
            : 'Internal server error',
      });
    }
  }

  // ---------- POST: create comment ----------
  if (req.method === 'POST') {
    try {
      const { recipeId: rawRecipeId, body: rawBody } = req.body || {};
      const actorEmail = getActorEmail(req); // ใครเป็นคนโพสต์
      const recipeId = toInt(rawRecipeId, NaN);
      const body = (rawBody || '').trim();

      if (!Number.isFinite(recipeId) || !body || !actorEmail) {
        return res.status(400).json({
          message:
            'ข้อมูลไม่ครบ (ต้องมี recipeId แบบตัวเลข, body ที่ไม่ว่าง และอีเมลผู้ใช้งาน)',
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO comments (\`Date\`, Comment_content, Recipe_code, Member_email)
         VALUES (NOW(), ?, ?, ?)`,
        [body, recipeId, actorEmail]
      );

      const insertId = result.insertId;

      const [commentRows] = await pool.execute(
        `SELECT 
           Comment_ID      AS id,
           \`Date\`         AS date,
           Comment_content AS body,
           Recipe_code     AS recipeId,
           Member_email    AS memberEmail
         FROM comments
         WHERE Comment_ID = ?`,
        [insertId]
      );

      let created = null;
      if (commentRows.length > 0) {
        created = await hydrateAuthor(commentRows[0]);
      }

      return res.status(201).json({ message: 'เพิ่มคอมเมนต์แล้ว', comment: created });
    } catch (e) {
      console.error('POST comment error:', e);
      return res.status(500).json({ message: 'เพิ่มคอมเมนต์ไม่สำเร็จ' });
    }
  }

  // ---------- PUT: update comment (เฉพาะเจ้าของเท่านั้น) ----------
  if (req.method === 'PUT') {
    try {
      const id = toInt(req.body?.id, NaN);
      const body = (req.body?.body || '').trim();
      const actorEmail = getActorEmail(req);

      if (!Number.isFinite(id) || !body || !actorEmail) {
        return res.status(400).json({
          message:
            'ข้อมูลไม่ครบ (ต้องมี id แบบตัวเลข, body ที่ไม่ว่าง และอีเมลผู้ใช้งาน)',
        });
      }

      // ตรวจสอบว่าเป็นเจ้าของคอมเมนต์เท่านั้น (ไม่รวมแอดมิน)
      const allowed = await isOwnerOfComment(id, actorEmail);
      if (!allowed) {
        return res.status(403).json({ message: 'คุณสามารถแก้ไขได้เฉพาะคอมเมนต์ของตัวเองเท่านั้น' });
      }

      await pool.execute(
        `UPDATE comments 
         SET Comment_content = ?
         WHERE Comment_ID = ?`,
        [body, id]
      );

      const [commentRows] = await pool.execute(
        `SELECT 
           Comment_ID      AS id,
           \`Date\`         AS date,
           Comment_content AS body,
           Recipe_code     AS recipeId,
           Member_email    AS memberEmail
         FROM comments
         WHERE Comment_ID = ?`,
        [id]
      );

      let updated = null;
      if (commentRows.length > 0) {
        updated = await hydrateAuthor(commentRows[0]);
      }

      return res.status(200).json({ message: 'อัปเดตคอมเมนต์แล้ว', comment: updated });
    } catch (e) {
      console.error('PUT comment error:', e);
      return res.status(500).json({ message: 'อัปเดตคอมเมนต์ไม่สำเร็จ' });
    }
  }

  // ---------- DELETE: delete comment (เจ้าของหรือแอดมิน) ----------
  if (req.method === 'DELETE') {
    try {
      const id = toInt(req.query.id ?? req.body?.id, NaN);
      const actorEmail = getActorEmail(req);

      if (!Number.isFinite(id) || !actorEmail) {
        return res.status(400).json({
          message: 'ต้องมี id ของคอมเมนต์ (ตัวเลข) และอีเมลผู้ใช้งาน',
        });
      }

      const allowed = await canModifyComment(id, actorEmail);
      if (!allowed) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบคอมเมนต์นี้' });
      }

      await pool.execute(`DELETE FROM comments WHERE Comment_ID = ?`, [id]);
      return res.status(200).json({ message: 'ลบคอมเมนต์แล้ว' });
    } catch (e) {
      console.error('DELETE comment error:', e);
      return res.status(500).json({ message: 'ลบคอมเมนต์ไม่สำเร็จ' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
