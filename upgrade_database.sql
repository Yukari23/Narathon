-- ===========================================
-- อัปเกรดระบบให้รองรับหลายมื้ออาหาร
-- รวมทุกขั้นตอนในไฟล์เดียว
-- ===========================================

USE food_recipes;

-- ===========================================
-- ขั้นตอนที่ 1: เปลี่ยนโครงสร้างตาราง
-- ===========================================

-- เปลี่ยนคอลัมน์ Meal จาก enum เป็น varchar
ALTER TABLE recipes 
MODIFY COLUMN Meal VARCHAR(100) DEFAULT NULL COMMENT 'มื้ออาหาร: breakfast, lunch, dinner หรือหลายมื้อคั่นด้วยจุลภาค เช่น breakfast,lunch,dinner';

-- ตรวจสอบโครงสร้างตาราง
SELECT '=== โครงสร้างตาราง recipes หลังอัปเดต ===' as info;
DESCRIBE recipes;

-- ===========================================
-- ขั้นตอนที่ 2: แสดงข้อมูลปัจจุบัน
-- ===========================================

SELECT '=== ข้อมูลมื้ออาหารปัจจุบัน ===' as info;
SELECT Recipe_code, Recipe_name, Meal FROM recipes WHERE Meal IS NOT NULL;

-- ===========================================
-- ขั้นตอนที่ 3: อัปเดตข้อมูลที่มีอยู่
-- ===========================================

-- อัปเดตข้อมูลตัวอย่างให้รองรับหลายมื้อ
UPDATE recipes 
SET Meal = 'breakfast,lunch' 
WHERE Recipe_code = 1 AND Meal = 'breakfast';

UPDATE recipes 
SET Meal = 'breakfast,dinner' 
WHERE Recipe_code = 2 AND Meal = 'breakfast';

-- เพิ่มข้อมูลทดสอบสูตรอาหารหลายมื้อ
INSERT INTO recipes (
    Recipe_code, 
    Recipe_name, 
    details, 
    Meal, 
    method, 
    raw_material, 
    Disease_tags, 
    Disease_code
) VALUES (
    999, 
    'ข้าวผัดสุขภาพ (ทดสอบหลายมื้อ)', 
    'ข้าวผัดที่เหมาะสำหรับหลายมื้อ - ทดสอบระบบ', 
    'breakfast,lunch,dinner', 
    '["ต้มน้ำให้เดือด", "ใส่ข้าวและผัก", "ผัดจนสุก"]', 
    '["ข้าวสวย 1 ถ้วย", "ผักต่างๆ 100 กรัม", "น้ำมันมะกอก 1 ช้อนชา"]', 
    'เบาหวาน,โรคหัวใจ', 
    1
);

-- ===========================================
-- ขั้นตอนที่ 4: ทดสอบการค้นหา
-- ===========================================

SELECT '=== ทดสอบการค้นหาตามมื้ออาหาร ===' as info;

-- ค้นหาสูตรที่เหมาะสำหรับมื้อเช้า
SELECT 'สูตรมื้อเช้า (breakfast):' as meal_type;
SELECT Recipe_code, Recipe_name, Meal 
FROM recipes 
WHERE Meal LIKE '%breakfast%' 
ORDER BY Recipe_code;

-- ค้นหาสูตรที่เหมาะสำหรับมื้อกลางวัน
SELECT 'สูตรมื้อกลางวัน (lunch):' as meal_type;
SELECT Recipe_code, Recipe_name, Meal 
FROM recipes 
WHERE Meal LIKE '%lunch%' 
ORDER BY Recipe_code;

-- ค้นหาสูตรที่เหมาะสำหรับมื้อเย็น
SELECT 'สูตรมื้อเย็น (dinner):' as meal_type;
SELECT Recipe_code, Recipe_name, Meal 
FROM recipes 
WHERE Meal LIKE '%dinner%' 
ORDER BY Recipe_code;

-- ค้นหาสูตรที่เหมาะสำหรับหลายมื้อ
SELECT 'สูตรหลายมื้อ (มีจุลภาค):' as meal_type;
SELECT Recipe_code, Recipe_name, Meal 
FROM recipes 
WHERE Meal LIKE '%,%' 
ORDER BY Recipe_code;

-- ===========================================
-- ขั้นตอนที่ 5: สถิติการใช้งาน
-- ===========================================

SELECT '=== สถิติการใช้งานมื้ออาหาร ===' as info;

-- สถิติแยกตามประเภท (มื้อเดียว vs หลายมื้อ)
SELECT 
    CASE 
        WHEN Meal LIKE '%,%' THEN 'หลายมื้อ'
        ELSE 'มื้อเดียว'
    END AS meal_type,
    COUNT(*) as count
FROM recipes 
WHERE Meal IS NOT NULL
GROUP BY meal_type;

-- สถิติแยกตามมื้ออาหาร
SELECT 
    Meal,
    COUNT(*) as recipe_count
FROM recipes 
WHERE Meal IS NOT NULL
GROUP BY Meal
ORDER BY recipe_count DESC;

-- ===========================================
-- ขั้นตอนที่ 6: ลบข้อมูลทดสอบ
-- ===========================================

-- ลบข้อมูลทดสอบ
DELETE FROM recipes WHERE Recipe_code = 999;

-- ===========================================
-- ขั้นตอนที่ 7: แสดงผลลัพธ์สุดท้าย
-- ===========================================

SELECT '=== ผลลัพธ์สุดท้าย ===' as info;
SELECT Recipe_code, Recipe_name, Meal FROM recipes WHERE Meal IS NOT NULL;

SELECT '=== การอัปเกรดเสร็จสิ้น! ===' as status;
SELECT 'ตอนนี้ระบบสามารถรองรับหลายมื้ออาหารได้แล้ว' as message;

-- ===========================================
-- หมายเหตุสำหรับการใช้งาน
-- ===========================================

/*
รูปแบบข้อมูลมื้ออาหาร:

1. มื้อเดียว:
   - breakfast (มื้อเช้า)
   - lunch (มื้อกลางวัน)
   - dinner (มื้อเย็น)

2. หลายมื้อ (คั่นด้วยจุลภาค):
   - breakfast,lunch (มื้อเช้าและกลางวัน)
   - lunch,dinner (มื้อกลางวันและเย็น)
   - breakfast,dinner (มื้อเช้าและเย็น)
   - breakfast,lunch,dinner (ทั้งสามมื้อ)

3. การค้นหา:
   - LIKE '%breakfast%' (หาสูตรที่เหมาะสำหรับมื้อเช้า)
   - LIKE '%,%' (หาสูตรที่เหมาะสำหรับหลายมื้อ)

4. API จะส่งข้อมูลในรูปแบบ:
   - มื้อเดียว: "breakfast"
   - หลายมื้อ: "breakfast,lunch,dinner"
*/
