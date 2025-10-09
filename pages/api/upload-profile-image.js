// /pages/api/upload-profile-image.js
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';

export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    filter: part => part.mimetype?.startsWith('image/'),
  });

  form.parse(req, (err, _fields, files) => {
    if (err) return res.status(400).json({ message: 'อัปโหลดไม่สำเร็จ', error: err.message });

    const f = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!f) return res.status(400).json({ message: 'ไม่พบไฟล์รูป (field name: image)' });

    // สร้าง path แบบเว็บ เช่น /uploads/xxx.jpg (ไม่ใส่ /public)
    const rel = '/' + path
      .relative(path.join(process.cwd(), 'public'), f.filepath || f.path)
      .replace(/\\+/g, '/')
      .replace(/^\/?public\//, '');

    return res.status(200).json({ url: rel.startsWith('/') ? rel : '/' + rel }); // => /uploads/xxx.jpg
  });
}
