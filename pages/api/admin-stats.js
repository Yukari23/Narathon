// /pages/api/admin-stats.js

// รองรับโปรเจ็กต์ที่ตำแหน่ง lib/db แตกต่างกัน (เช่นย้ายโฟลเดอร์)
async function getPool() {
  try {
    const mod = await import('../lib/db');
    return mod.default || mod;
  } catch {
    const mod2 = await import('../lib/db');
    return mod2.default || mod2;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let pool;
  try {
    pool = await getPool();
  } catch (e) {
    console.error('Cannot init DB pool:', e);
    return res.status(500).json({ message: 'DB init error', error: e.message });
  }

  try {
    // ===== ดึงสถิติโดยรวม + รายการล่าสุด (รันขนาน) =====
    const [
      [usersCount],
      [recipesCount],
      [bookmarksCount],
      [commentsCount],
      [recentUsers],
      [recentRecipes],
      [recentComments]
    ] = await Promise.all([
      // Total users
      pool.execute('SELECT COUNT(*) AS count FROM members'),

      // Total recipes
      pool.execute('SELECT COUNT(*) AS count FROM recipes'),

      // Total bookmarks
      pool.execute('SELECT COUNT(*) AS count FROM bookmarks'),

      // Total comments
      pool.execute('SELECT COUNT(*) AS count FROM comments'),

      // Recent users (ไม่มี created_at → ใช้อีเมลล่าสุดแทน)
      pool.execute(`
        SELECT 
          First_name       AS name,
          Email_member     AS email,
          Image            AS image,
          Disease_tags     AS diseaseTags
        FROM members
        ORDER BY Email_member DESC
        LIMIT 5
      `),

      // Recent recipes (ใช้ details แทน description)
      pool.execute(`
        SELECT
          Recipe_code      AS id,
          Recipe_name      AS title,
          Image            AS image,
          details          AS description,
          Disease_tags     AS diseaseTags,
          Meal             AS meal
        FROM recipes
        ORDER BY Recipe_code DESC
        LIMIT 5
      `),

      // Recent comments (7 วันล่าสุด)
      pool.execute(`
        SELECT
          c.Comment_ID      AS id,
          c.Comment_content AS body,
          c.Recipe_code     AS recipeId,
          c.Member_email    AS memberEmail,
          c.Date            AS date,
          r.Recipe_name     AS recipeTitle
        FROM comments c
        LEFT JOIN recipes r ON r.Recipe_code = c.Recipe_code
        WHERE c.Date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY c.Date DESC
        LIMIT 5
      `)
    ]);

    // ===== แปลงข้อมูล recent users =====
    const processedRecentUsers = recentUsers.map(u => ({
      name: u.name || 'ไม่ระบุชื่อ',
      email: u.email,
      image: u.image || '/images/GF3.jpg',
      diseaseTags: u.diseaseTags
        ? String(u.diseaseTags).split(',').map(t => t.trim()).filter(Boolean)
        : []
    }));

    // ===== แปลงข้อมูล recent recipes =====
    const processedRecentRecipes = recentRecipes.map(r => ({
      id: r.id,
      title: r.title,
      image: r.image || '/images/GF3.jpg',
      description: r.description || '',
      diseaseTags: r.diseaseTags
        ? String(r.diseaseTags).split(',').map(t => t.trim()).filter(Boolean)
        : [],
      meal: r.meal
    }));

    // ===== เติมข้อมูลชื่อ/รูปผู้คอมเมนต์ (admin/member) =====
    const processedRecentComments = await Promise.all(
      recentComments.map(async (c) => {
        let authorName = '';
        let authorImage = '/images/GF3.jpg';
        let userType = 'member';

        try {
          // ตรวจว่าเป็นแอดมินไหม
          const [adminRows] = await pool.execute(
            'SELECT First_name FROM admin WHERE Email_Admin = ?',
            [c.memberEmail]
          );

          if (adminRows.length > 0) {
            authorName = adminRows[0].First_name || 'แอดมิน';
            userType = 'admin';
          } else {
            // มิฉะนั้นลองเป็นสมาชิก
            const [memberRows] = await pool.execute(
              'SELECT First_name, Image FROM members WHERE Email_member = ?',
              [c.memberEmail]
            );
            if (memberRows.length > 0) {
              authorName = memberRows[0].First_name || '';
              authorImage = memberRows[0].Image || '/images/GF3.jpg';
            }
          }
        } catch (e) {
          console.error('Error fetching user info for comment:', e);
        }

        return {
          id: c.id,
          body: c.body,
          recipeId: c.recipeId,
          recipeTitle: c.recipeTitle,
          memberEmail: c.memberEmail,
          date: c.date,
          authorName: authorName || (c.memberEmail ? String(c.memberEmail).split('@')[0] : 'ไม่ระบุ'),
          authorImage,
          userType
        };
      })
    );

    // ===== growth rate (ไม่มี created_at → เท่ากับนับปัจจุบัน) =====
    const [
      [prevUsersCount],
      [prevRecipesCount],
      [prevBookmarksCount],
      [prevCommentsCount]
    ] = await Promise.all([
      pool.execute('SELECT COUNT(*) AS count FROM members'),
      pool.execute('SELECT COUNT(*) AS count FROM recipes'),
      pool.execute('SELECT COUNT(*) AS count FROM bookmarks'),
      pool.execute('SELECT COUNT(*) AS count FROM comments')
    ]);

    const calculateGrowthRate = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // ====== สถิติ “จำนวนสมาชิกตามโรคที่สนใจ (จากหน้าโปรไฟล์)” ======
    let diseaseStats = [];
    let diseaseSource = 'user_profile_selection';

    try {
      // A) โครงสร้างที่แนะนำ: ตาราง many-to-many (member_disease_tags)
      const [rowsA] = await pool.execute(`
        SELECT 
          d.Disease_type AS disease_name,
          COUNT(mdt.member_email) AS member_count
        FROM diseases d
        LEFT JOIN member_disease_tags mdt
          ON mdt.Disease_code = d.Disease_code
        GROUP BY d.Disease_code, d.Disease_type
        ORDER BY member_count DESC, d.Disease_type ASC
      `);
      diseaseStats = rowsA;
      diseaseSource = 'member_disease_tags';
    } catch (eA) {
      try {
        // B) Fallback 1: members.Disease_tags เก็บเป็น CSV ของ "รหัสโรค" หรือ "ชื่อโรค"
        //    - ตัดช่องว่างด้วย REPLACE
        //    - เทียบทั้งรหัส (FIND_IN_SET(d.Disease_code, ...)) และชื่อ (FIND_IN_SET(LOWER(d.Disease_type), LOWER(...)))
        const [rowsB] = await pool.execute(`
          SELECT
            d.Disease_type AS disease_name,
            SUM(
              CASE 
                WHEN 
                  FIND_IN_SET(CAST(d.Disease_code AS CHAR), REPLACE(IFNULL(m.Disease_tags,''), ' ', '')) > 0
                  OR FIND_IN_SET(
                       LOWER(d.Disease_type),
                       LOWER(REPLACE(IFNULL(m.Disease_tags,''), ' ', ''))
                     ) > 0
                THEN 1 ELSE 0
              END
            ) AS member_count
          FROM diseases d
          LEFT JOIN members m ON 1=1
          GROUP BY d.Disease_code, d.Disease_type
          ORDER BY member_count DESC, d.Disease_type ASC
        `);
        diseaseStats = rowsB;
        diseaseSource = 'members.Disease_tags';
      } catch (eB) {
        try {
          // C) Fallback 2: ใช้ members.Disease_code (single code)
          const [rowsC] = await pool.execute(`
            SELECT 
              d.Disease_type AS disease_name,
              COUNT(m.Email_member) AS member_count
            FROM diseases d
            LEFT JOIN members m
              ON m.Disease_code = d.Disease_code
            GROUP BY d.Disease_code, d.Disease_type
            ORDER BY member_count DESC, d.Disease_type ASC
          `);
          diseaseStats = rowsC;
          diseaseSource = 'members.Disease_code';
        } catch (eC) {
          console.error('Disease stats error:', eA?.message, eB?.message, eC?.message);
          diseaseStats = [];
          diseaseSource = 'unknown';
        }
      }
    }

    // ===== รวมผลลัพธ์ทั้งหมด =====
    const stats = {
      totalUsers: usersCount[0].count,
      totalRecipes: recipesCount[0].count,
      totalBookmarks: bookmarksCount[0].count,
      totalComments: commentsCount[0].count,
      growthRates: {
        users:     calculateGrowthRate(usersCount[0].count,     prevUsersCount[0].count),
        recipes:   calculateGrowthRate(recipesCount[0].count,   prevRecipesCount[0].count),
        bookmarks: calculateGrowthRate(bookmarksCount[0].count, prevBookmarksCount[0].count),
        comments:  calculateGrowthRate(commentsCount[0].count,  prevCommentsCount[0].count)
      },
      recent: {
        users: processedRecentUsers,
        recipes: processedRecentRecipes,
        comments: processedRecentComments
      },
      // ✅ ใหม่: รายงานตามโรค (จากหน้าโปรไฟล์)
      diseaseStats,
      diseaseSource
    };

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('GET /api/admin-stats error:', error);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดจากฐานข้อมูล',
      error: error.message
    });
  }
}
