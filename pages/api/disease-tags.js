// /pages/api/member/disease-tags.js
import pool from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, diseaseTags } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Missing email' });
    }
    if (!Array.isArray(diseaseTags)) {
      return res.status(400).json({ message: 'diseaseTags must be an array of strings' });
    }

    // ทำความสะอาดค่า (trim และกรองค่าว่าง)
    const clean = diseaseTags.map(s => String(s).trim()).filter(Boolean);

    // เก็บเป็นคอมมาคั่น
    const joined = clean.join(', ');

    const [result] = await pool.execute(
      `UPDATE members
       SET Disease_tags = ?
       WHERE Email_member = ?`,
      [joined, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    return res.status(200).json({ message: 'Updated', diseaseTags: clean });
  } catch (err) {
    return res.status(500).json({ message: 'DB error', error: err.message });
  }
}
