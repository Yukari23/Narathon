import path from 'path';
import fs from 'fs';
import formidable from 'formidable';
import pool from '../lib/db';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // รับฟอร์ม (ไฟล์ใหญ่/ข้อความยาว)
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({
        uploadDir,
        keepExtensions: true,
        multiples: false,
        maxFileSize: 10 * 1024 * 1024,   // 10MB เฉพาะไฟล์
        maxFieldsSize: 5 * 1024 * 1024,  // 5MB รวมฟิลด์ข้อความ
      });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const getField = (name) => {
      const value = fields?.[name];
      return Array.isArray(value) ? value[0] : value;
    };

    // ✅ รวมหลายช่องให้เป็น "รายการ" รองรับ xxx[], xxx_1, xxx1
    function getMultiFieldList(srcFields, baseNames) {
      const items = [];
      for (const base of baseNames) {
        const direct = srcFields?.[base];

        // name="base[]"
        if (Array.isArray(direct)) {
          for (const v of direct) {
            const s = String(v || '').trim();
            if (s) items.push(s);
          }
        } else if (typeof direct === 'string') {
          const s = direct.trim();
          if (s) items.push(s);
        }

        // base_1, base_2 / base1, base2
        const regexes = [
          new RegExp(`^${base}_(\\d+)$`),
          new RegExp(`^${base}(\\d+)$`),
        ];

        const numbered = Object.keys(srcFields || {})
          .map((k) => {
            for (const rx of regexes) {
              const m = k.match(rx);
              if (m) return { key: k, no: parseInt(m[1], 10) };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => a.no - b.no);

        for (const { key } of numbered) {
          const v = srcFields[key];
          const s = Array.isArray(v) ? String(v[0] || '').trim() : String(v || '').trim();
          if (s) items.push(s);
        }
      }
      return items;
    }

    // ===== อ่านค่าจากฟอร์ม =====
    const Recipe_name      = getField('Recipe_name') || '';
    const details          = getField('details') || '';
    const Meal             = getField('Meal') || '';
    const diseaseTagsRaw   = getField('Disease_tags') || '';
    const Member_email     = getField('Member_email') || null;
    const Disease_code_raw = getField('Disease_code');
    const Admin            = getField('Admin') || null;

    // ✅ รายการส่วนผสม/วิธีทำ (เก็บเป็นข้อ ๆ)
    let ingredientList = getMultiFieldList(fields, ['raw_material', 'ingredient']);
    let stepList       = getMultiFieldList(fields, ['method', 'step']);

    // เผื่อฟอร์มส่งมาเป็นช่องเดี่ยว (fallback)
    if (ingredientList.length === 0) {
      const singleIng = getField('raw_material');
      if (singleIng) ingredientList = String(singleIng).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    if (stepList.length === 0) {
      const singleStep = getField('method');
      if (singleStep) stepList = String(singleStep).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }

    // ===== ตรวจสอบ & เตรียมค่าอื่น ๆ =====
    const allowedMeals = new Set(['breakfast', 'lunch', 'dinner']);
    if (Meal && !allowedMeals.has(Meal)) {
      return res.status(400).json({ message: 'ค่า Meal ต้องเป็น breakfast, lunch, หรือ dinner' });
    }

    const Disease_code =
      Disease_code_raw === undefined || Disease_code_raw === ''
        ? null
        : Number.isNaN(Number(Disease_code_raw))
          ? null
          : Number(Disease_code_raw);

    // ไฟล์รูป
    const uploaded = files?.Image;
    const imageFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    const imageBasename = imageFile ? path.basename(imageFile.filepath || imageFile.path || '') : null;

    // ตัดความยาวเฉพาะคอลัมน์ที่เป็น VARCHAR
    const truncate = (v, max) => (v == null ? null : String(v).slice(0, max));

    const ImageSafe       = truncate(imageBasename ? `/uploads/${imageBasename}` : null, 255);
    const RecipeNameSafe  = truncate(Recipe_name, 255);
    const DiseaseTagsSafe = truncate(diseaseTagsRaw, 255);
    const MemberEmailSafe = truncate(Member_email, 191);
    const AdminSafe       = truncate(Admin, 50);

    // ข้อความยาว (MEDIUMTEXT) — details เก็บเป็นสตริงปกติ
    const normalizeMultiline = (s) =>
      String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const DetailsSafe = normalizeMultiline(details);

    // 🔥 เก็บ “เป็นข้อๆ” จริง ๆ: JSON array (string) ใน MEDIUMTEXT
    const MethodSafe      = JSON.stringify(stepList);        // ["ขั้นตอนที่ 1","ขั้นตอนที่ 2",...]
    const RawMaterialSafe = JSON.stringify(ingredientList);  // ["ส่วนผสม 1","ส่วนผสม 2",...]

    // ===== INSERT =====
    const sql = `
      INSERT INTO recipes
        (Image, details, Recipe_name, Meal, method, raw_material, Disease_tags, Member_email, Disease_code, Admin)
      VALUES
        (?,     ?,       ?,          ?,    ?,      ?,            ?,            ?,            ?,            ?)
    `;
    const params = [
      ImageSafe,
      DetailsSafe,
      RecipeNameSafe,
      Meal || null,
      MethodSafe,
      RawMaterialSafe,
      DiseaseTagsSafe,
      MemberEmailSafe,
      Disease_code,
      AdminSafe,
    ];

    try {
      const [result] = await pool.execute(sql, params);
      return res.status(200).json({ message: 'เพิ่มสูตรอาหารเรียบร้อย', id: result.insertId });
    } catch (dbErr) {
      if (dbErr?.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
          message: 'ข้อมูลยาวเกินความจุของคอลัมน์ (ตรวจสอบคอลัมน์ที่ยังเป็น VARCHAR สั้น ๆ)',
          code: dbErr.code,
        });
      }
      if (dbErr && (dbErr.code === 'ER_WRONG_VALUE_FOR_TYPE' || dbErr.code === 'ER_TRUNCATED_WRONG_VALUE' || dbErr.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD')) {
        return res.status(400).json({ message: 'ค่า Meal ต้องเป็น breakfast, lunch, หรือ dinner', code: dbErr.code });
      }
      if (dbErr?.code === 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({ message: 'ไม่พบตาราง (ตรวจสอบชื่อตาราง recipes)', code: dbErr.code });
      }
      if (dbErr?.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({ message: 'คอลัมน์ใน SQL ไม่ตรงกับตาราง (ตรวจสอบชื่อคอลัมน์ในคำสั่ง INSERT)', code: dbErr.code, error: dbErr.sqlMessage });
      }
      if (dbErr && (dbErr.code === 'ER_BAD_DB_ERROR' || dbErr.code === 'ER_ACCESS_DENIED_ERROR')) {
        return res.status(500).json({ message: 'การเชื่อมต่อฐานข้อมูลล้มเหลว (ชื่อฐานข้อมูล/สิทธิ์ไม่ถูกต้อง)', code: dbErr.code, error: dbErr.sqlMessage });
      }
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', code: dbErr.code, error: dbErr.sqlMessage || dbErr.message });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
}
