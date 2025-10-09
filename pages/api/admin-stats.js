// /pages/api/admin-stats.js
import pool from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all statistics in parallel
    const [
      [usersCount],
      [recipesCount],
      [bookmarksCount],
      [commentsCount],
      [recentUsers],
      [recentRecipes],
      [recentComments]
    ] = await Promise.all([
      // Total users count
      pool.execute('SELECT COUNT(*) as count FROM members'),
      
      // Total recipes count
      pool.execute('SELECT COUNT(*) as count FROM recipes'),
      
      // Total bookmarks count
      pool.execute('SELECT COUNT(*) as count FROM bookmarks'),
      
      // Total comments count
      pool.execute('SELECT COUNT(*) as count FROM comments'),
      
      // Recent users - ไม่มี created_at column
      pool.execute(`
        SELECT 
          First_name as name,
          Email_member as email,
          Image as image,
          Disease_tags as diseaseTags,
          comment
        FROM members 
        ORDER BY Email_member DESC
        LIMIT 5
      `),
      
      // Recent recipes - ใช้ details แทน Description
      pool.execute(`
        SELECT 
          Recipe_code as id,
          Recipe_name as title,
          Image as image,
          details as description,
          Disease_tags as diseaseTags,
          Meal as meal
        FROM recipes 
        ORDER BY Recipe_code DESC
        LIMIT 5
      `),
      
      // Recent comments (last 7 days)
      pool.execute(`
        SELECT 
          c.Comment_ID as id,
          c.Comment_content as body,
          c.Recipe_code as recipeId,
          c.Member_email as memberEmail,
          c.Date as date,
          r.Recipe_name as recipeTitle
        FROM comments c
        LEFT JOIN recipes r ON r.Recipe_code = c.Recipe_code
        WHERE c.Date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY c.Date DESC
        LIMIT 5
      `)
    ]);

    // Process recent users data
    const processedRecentUsers = recentUsers.map(user => ({
      name: user.name,
      email: user.email,
      image: user.image || '/images/GF3.jpg',
      diseaseTags: user.diseaseTags ? user.diseaseTags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      comment: user.comment || ''
    }));

    // Process recent recipes data
    const processedRecentRecipes = recentRecipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image || '/images/GF3.jpg',
      description: recipe.description || '',
      diseaseTags: recipe.diseaseTags ? recipe.diseaseTags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      meal: recipe.meal
    }));

    // Process recent comments data
    const processedRecentComments = await Promise.all(recentComments.map(async (comment) => {
      let authorName = '';
      let authorImage = '/images/GF3.jpg';
      let userType = 'member';

      try {
        // Check if admin
        const [adminRows] = await pool.execute(
          'SELECT First_name FROM admin WHERE Email_Admin = ?',
          [comment.memberEmail]
        );

        if (adminRows.length > 0) {
          authorName = adminRows[0].First_name || 'แอดมิน';
          userType = 'admin';
        } else {
          // Check if member
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
        console.error('Error fetching user info for comment:', error);
      }

      return {
        id: comment.id,
        body: comment.body,
        recipeId: comment.recipeId,
        recipeTitle: comment.recipeTitle,
        memberEmail: comment.memberEmail,
        date: comment.date,
        authorName: authorName || (comment.memberEmail ? String(comment.memberEmail).split('@')[0] : 'ไม่ระบุ'),
        authorImage: authorImage,
        userType: userType
      };
    }));

    // Calculate growth rates - ใช้ข้อมูลปัจจุบันทั้งหมด (ไม่มี created_at)
    const [
      [prevUsersCount],
      [prevRecipesCount],
      [prevBookmarksCount],
      [prevCommentsCount]
    ] = await Promise.all([
      pool.execute('SELECT COUNT(*) as count FROM members'), // ใช้ข้อมูลทั้งหมด
      pool.execute('SELECT COUNT(*) as count FROM recipes'), // ใช้ข้อมูลทั้งหมด
      pool.execute('SELECT COUNT(*) as count FROM bookmarks'), // ใช้ข้อมูลทั้งหมด
      pool.execute('SELECT COUNT(*) as count FROM comments') // ใช้ข้อมูลทั้งหมด
    ]);

    const calculateGrowthRate = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const stats = {
      totalUsers: usersCount[0].count,
      totalRecipes: recipesCount[0].count,
      totalBookmarks: bookmarksCount[0].count,
      totalComments: commentsCount[0].count,
      growthRates: {
        users: calculateGrowthRate(usersCount[0].count, prevUsersCount[0].count),
        recipes: calculateGrowthRate(recipesCount[0].count, prevRecipesCount[0].count),
        bookmarks: calculateGrowthRate(bookmarksCount[0].count, prevBookmarksCount[0].count),
        comments: calculateGrowthRate(commentsCount[0].count, prevCommentsCount[0].count)
      },
      recent: {
        users: processedRecentUsers,
        recipes: processedRecentRecipes,
        comments: processedRecentComments
      }
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

