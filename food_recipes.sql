-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 18, 2025 at 08:21 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `food_recipes`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `Email_Admin` varchar(50) NOT NULL,
  `First_name` varchar(50) DEFAULT NULL,
  `Image` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `Password` varchar(225) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`Email_Admin`, `First_name`, `Image`, `comment`, `Password`) VALUES
('admin@example.com', 'ณราธร สีเลา', '/uploads/1760334344640_SkPo5b7-band-of-brothers-wallpaper.jpg', NULL, '1');

-- --------------------------------------------------------

--
-- Table structure for table `bookmarks`
--

CREATE TABLE `bookmarks` (
  `Bookmark_ID` int(11) NOT NULL,
  `Member_email` varchar(255) NOT NULL,
  `Recipe_code` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bookmarks`
--

INSERT INTO `bookmarks` (`Bookmark_ID`, `Member_email`, `Recipe_code`) VALUES
(8, 'admin@example.com', 1),
(7, 'admin@example.com', 2),
(5, 'admin@example.com', 3),
(6, 'Narathon1307@gmail.com', 3);

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `Comment_ID` int(11) NOT NULL,
  `Date` datetime NOT NULL DEFAULT current_timestamp(),
  `Comment_content` text NOT NULL,
  `Recipe_code` int(11) NOT NULL,
  `Member_email` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`Comment_ID`, `Date`, `Comment_content`, `Recipe_code`, `Member_email`) VALUES
(6, '2025-10-17 23:22:08', 'ฟกไ', 3, 'admin@example.com'),
(7, '2025-10-18 01:17:55', 'qwertyuio', 1, 'admin@example.com'),
(8, '2025-10-18 01:19:24', '852', 1, 'Narathon1307@gmail.com'),
(9, '2025-10-18 01:19:27', 'afsge', 1, 'Narathon1307@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `diseases`
--

CREATE TABLE `diseases` (
  `Disease_code` int(11) NOT NULL,
  `Disease_type` varchar(100) DEFAULT NULL,
  `Email_member` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `diseases`
--

INSERT INTO `diseases` (`Disease_code`, `Disease_type`, `Email_member`) VALUES
(1, 'เบาหวาน', NULL),
(2, 'โรคหัวใจ', NULL),
(3, 'ความดันโลหิตสูง', NULL),
(4, 'ไขมันในเลือดสูง', NULL),
(5, 'โรคไต', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `Email_member` varchar(50) NOT NULL,
  `First_name` varchar(50) DEFAULT NULL,
  `Password` varchar(225) DEFAULT NULL,
  `OTP` varchar(6) DEFAULT NULL,
  `comment` varchar(225) DEFAULT NULL,
  `Image` varchar(255) DEFAULT NULL,
  `Disease_tags` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`Email_member`, `First_name`, `Password`, `OTP`, `comment`, `Image`, `Disease_tags`) VALUES
('erythrocyte@gmail.com', 'เม็ดเลือดเเดง', '123456', NULL, NULL, NULL, NULL),
('Narathon1307@gmail.com', 'เม็ดเลือดขาว', '123456', '207009', 'อ้วน', '/uploads/uaakkdf00abbc4ixihw6w77ih.jpg', ''),
('s123omchai@email.com', 'นราธร นราธร', '123456', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `recipes`
--

CREATE TABLE `recipes` (
  `Recipe_code` int(11) NOT NULL,
  `Image` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `Recipe_name` varchar(200) DEFAULT NULL,
  `Meal` varchar(100) DEFAULT NULL COMMENT 'มื้ออาหาร: breakfast, lunch, dinner หรือหลายมื้อคั่นด้วยจุลภาค เช่น breakfast,lunch,dinner',
  `method` mediumtext NOT NULL,
  `raw_material` mediumtext NOT NULL,
  `Disease_tags` text DEFAULT NULL,
  `Member_email` varchar(50) DEFAULT NULL,
  `Disease_code` int(11) DEFAULT NULL,
  `Admin` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `recipes`
--

INSERT INTO `recipes` (`Recipe_code`, `Image`, `details`, `Recipe_name`, `Meal`, `method`, `raw_material`, `Disease_tags`, `Member_email`, `Disease_code`, `Admin`) VALUES
(1, '/uploads/t093j3epovbhvdp90ec8yn7ad.webp', '', 'โจ๊กข้าวกล้องอกไก่ (Brown Rice Porridge with Chicken Breast)', 'breakfast,lunch', '[\"ต้มน้ำซุปให้เดือด ใส่ไก่และแครอท เคี่ยวจนไก่สุก\",\"ใส่ข้าวกล้อง ปรุงรสด้วยซีอิ๊วขาวโซเดียมต่ำ\",\"โรยขิงและต้นหอมก่อนเสิร์ฟ\"]', '[\"ข้าวกล้องหุงสุก ½ ถ้วย\",\"อกไก่สับ 80 กรัม\",\"แครอทหั่นเต๋า 2 ช้อนโต๊ะ\",\"น้ำซุปผัก 2 ถ้วย\",\"ขิงซอย 1 ช้อนชา, ต้นหอม\"]', 'ไขมันในเลือดสูง', NULL, 4, NULL),
(2, '/uploads/asrznc7yevivm3o88j84p9z49.jpg', 'อะโวคาโดมีไขมันไม่อิ่มตัวเชิงเดี่ยว ช่วยลด LDL และเพิ่ม HDL เหมาะกับผู้ป่วยหัวใจ', 'ขนมปังโฮลวีตทาอะโวคาโดไข่ต้ม (Whole Wheat Toast with Avocado & Egg)', 'lunch,dinner,breakfast', '[\"ทาอะโวคาโดบดบนขนมปัง\",\"วางไข่ต้มฝานบาง โรยพริกไทย\",\"เสิร์ฟพร้อมผักสด เช่น มะเขือเทศหรือแตงกวา\"]', '[\"ขนมปังโฮลวีต 2 แผ่น\",\"อะโวคาโดบด ½ ผล\",\"ไข่ต้ม 1 ฟอง\",\"พริกไทยดำ, น้ำมะนาวเล็กน้อย\"]', 'โรคหัวใจ,โรคไต', NULL, 2, NULL),
(3, '/uploads/vudfh1pvd6degqmkyazluquh2.jpg', 'แซลมอนให้โอเมก้า-3 ลดการอักเสบของหลอดเลือด ข้าวไรซ์เบอร์รี่ช่วยควบคุมระดับน้ำตาลในเลือดได้ดี', 'ข้าวไรซ์เบอร์รี่กับสเต๊กปลาแซลมอนย่าง (Grilled Salmon with Brown Rice)', 'breakfast,lunch,dinner', '[\"[\\\"ย่างปลาโดยไม่ใช้น้ำมัน (หรือใช้น้ำมันรำข้าวเล็กน้อย)\\\",\\\"จัดเสิร์ฟคู่ข้าวไรซ์เบอร์รี่และสลัด\\\",\\\"ราดน้ำสลัดโยเกิร์ตบาง ๆ\\\"]\"]', '[\"[\\\"ปลาแซลมอน 120 กรัม\\\",\\\"ข้าวไรซ์เบอร์รี่ ½ ถ้วย\\\",\\\"ผักสลัดรวม (ผักกาด, แครอท, มะเขือเทศ)\\\",\\\"น้ำสลัดโยเกิร์ต (โยเกิร์ตธรรมชาติ + น้ำมะนาว + น้ำผึ้ง ½ ช้อนชา)\\\"]\"]', 'เบาหวาน', NULL, 1, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`Email_Admin`);

--
-- Indexes for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD PRIMARY KEY (`Bookmark_ID`),
  ADD UNIQUE KEY `uniq_member_recipe` (`Member_email`,`Recipe_code`),
  ADD KEY `idx_bookmarks_email` (`Member_email`),
  ADD KEY `idx_bookmarks_recipe` (`Recipe_code`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`Comment_ID`),
  ADD KEY `Recipe_code` (`Recipe_code`);

--
-- Indexes for table `diseases`
--
ALTER TABLE `diseases`
  ADD PRIMARY KEY (`Disease_code`),
  ADD KEY `Email_member` (`Email_member`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`Email_member`);

--
-- Indexes for table `recipes`
--
ALTER TABLE `recipes`
  ADD PRIMARY KEY (`Recipe_code`),
  ADD KEY `Member_email` (`Member_email`),
  ADD KEY `Disease_code` (`Disease_code`),
  ADD KEY `Admin` (`Admin`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookmarks`
--
ALTER TABLE `bookmarks`
  MODIFY `Bookmark_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `Comment_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `diseases`
--
ALTER TABLE `diseases`
  MODIFY `Disease_code` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `recipes`
--
ALTER TABLE `recipes`
  MODIFY `Recipe_code` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1073;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookmarks`
--
ALTER TABLE `bookmarks`
  ADD CONSTRAINT `fk_bookmarks_recipe` FOREIGN KEY (`Recipe_code`) REFERENCES `recipes` (`Recipe_code`) ON DELETE CASCADE;

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `fk_comments_recipe` FOREIGN KEY (`Recipe_code`) REFERENCES `recipes` (`Recipe_code`) ON DELETE CASCADE;

--
-- Constraints for table `diseases`
--
ALTER TABLE `diseases`
  ADD CONSTRAINT `diseases_ibfk_1` FOREIGN KEY (`Email_member`) REFERENCES `members` (`Email_member`);

--
-- Constraints for table `recipes`
--
ALTER TABLE `recipes`
  ADD CONSTRAINT `recipes_ibfk_1` FOREIGN KEY (`Member_email`) REFERENCES `members` (`Email_member`),
  ADD CONSTRAINT `recipes_ibfk_2` FOREIGN KEY (`Disease_code`) REFERENCES `diseases` (`Disease_code`),
  ADD CONSTRAINT `recipes_ibfk_3` FOREIGN KEY (`Admin`) REFERENCES `admin` (`Email_Admin`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
