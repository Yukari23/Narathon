-- ===========================================
-- SQL Script for Cleaning Up Meal Data
-- แก้ไขข้อมูล Meal ที่มีรูปแบบผิดปกติ
-- ===========================================

-- 1. แสดงข้อมูล Meal ปัจจุบัน (ก่อนทำความสะอาด)
SELECT Recipe_code, Recipe_name, Meal FROM recipes WHERE Meal IS NOT NULL ORDER BY Recipe_code;

-- 2. แก้ไขข้อมูลที่มีจุลภาคขึ้นต้น (เช่น ",lunch,breakfast,dinner")
UPDATE recipes 
SET Meal = TRIM(LEADING ',' FROM Meal)
WHERE Meal LIKE ',%';

-- 3. แก้ไขข้อมูลที่มีช่องว่างผิดปกติ (เช่น "lunch   h,dinner,breakfast")
UPDATE recipes 
SET Meal = REPLACE(Meal, '   ', ' ')
WHERE Meal LIKE '%   %';

-- 4. แก้ไขข้อมูลที่มีช่องว่างหลายตัว
UPDATE recipes 
SET Meal = REGEXP_REPLACE(Meal, '\\s+', ' ')
WHERE Meal REGEXP '\\s{2,}';

-- 5. ลบช่องว่างหน้าและหลังจุลภาค
UPDATE recipes 
SET Meal = REPLACE(REPLACE(Meal, ', ', ','), ' ,', ',')
WHERE Meal LIKE '%, %' OR Meal LIKE '%,%';

-- 6. แก้ไขข้อมูลที่มี "h" ติดกับ "lunch" (เช่น "lunchh")
UPDATE recipes 
SET Meal = REPLACE(Meal, 'lunchh', 'lunch')
WHERE Meal LIKE '%lunchh%';

-- 7. แสดงข้อมูล Meal หลังทำความสะอาด
SELECT Recipe_code, Recipe_name, Meal FROM recipes WHERE Meal IS NOT NULL ORDER BY Recipe_code;

-- 8. แสดงสถิติการใช้งานมื้ออาหาร
SELECT
    SUBSTRING_INDEX(SUBSTRING_INDEX(t.Meal, ',', n.n), ',', -1) AS single_meal,
    COUNT(*) AS count
FROM
    recipes t
INNER JOIN
    (SELECT a.N + b.N * 10 + 1 n
     FROM
         (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
        ,(SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
     ORDER BY n
    ) n
    ON n.n <= 1 + (LENGTH(t.Meal) - LENGTH(REPLACE(t.Meal, ',', '')))
WHERE t.Meal IS NOT NULL AND t.Meal != ''
GROUP BY single_meal
ORDER BY count DESC;
