# 🍽️ FoodCare - แอปพลิเคชันสูตรอาหารเพื่อสุขภาพ

แอปพลิเคชันเว็บสำหรับค้นหาและจัดการสูตรอาหารเพื่อสุขภาพ พร้อมระบบบุคมาร์กและความคิดเห็น

## ✨ ฟีเจอร์หลัก

### 👤 สำหรับผู้ใช้ทั่วไป
- 🔍 **ค้นหาสูตรอาหาร** - ค้นหาตามชื่อ, โรค, และมื้ออาหาร
- 📖 **ดูรายละเอียดสูตร** - ส่วนผสม, วิธีการทำ, และข้อมูลโภชนาการ
- 💬 **แสดงความคิดเห็น** - แชร์ความคิดเห็นและประสบการณ์
- 🔖 **ระบบบุคมาร์ก** - บันทึกสูตรที่ชอบ (ต้องสมัครสมาชิก)

### 👨‍💼 สำหรับสมาชิก
- 📝 **สมัครสมาชิก** - สร้างบัญชีเพื่อใช้งานฟีเจอร์เพิ่มเติม
- 🔐 **เข้าสู่ระบบ** - เข้าถึงฟีเจอร์ส่วนตัว
- 🔄 **ลืมรหัสผ่าน** - ระบบ OTP สำหรับตั้งรหัสผ่านใหม่
- 👤 **จัดการโปรไฟล์** - แก้ไขข้อมูลส่วนตัว

### 🛠️ สำหรับแอดมิน
- ➕ **เพิ่มสูตรอาหาร** - สร้างสูตรใหม่พร้อมรูปภาพ
- ✏️ **แก้ไขสูตร** - ปรับปรุงข้อมูลสูตรอาหาร
- 🗑️ **ลบสูตร** - จัดการเนื้อหา
- 📊 **แดชบอร์ด** - สถิติการใช้งานและจัดการผู้ใช้

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนดระบบ
- Node.js 14.0 หรือใหม่กว่า
- MySQL 5.7 หรือใหม่กว่า
- npm หรือ yarn

### การติดตั้ง

1. **Clone โปรเจกต์**
```bash
git clone <repository-url>
cd food_recipes
```

2. **ติดตั้ง dependencies**
```bash
npm install
```

3. **ตั้งค่าฐานข้อมูล**
- สร้างฐานข้อมูล MySQL ชื่อ `food_recipes`
- นำเข้าไฟล์ SQL schema (ถ้ามี)

4. **ตั้งค่าการเชื่อมต่อฐานข้อมูล**
- แก้ไขไฟล์ `pages/lib/db.js` ให้ตรงกับข้อมูล MySQL ของคุณ

5. **รันเซิร์ฟเวอร์**
```bash
npm run dev
```

6. **เปิดเบราว์เซอร์**
```
http://localhost:3000
```

## 📁 โครงสร้างโปรเจกต์

```
food_recipes/
├── pages/                 # หน้าเว็บและ API routes
│   ├── api/              # API endpoints
│   │   ├── login.js      # เข้าสู่ระบบ
│   │   ├── register.js   # สมัครสมาชิก
│   │   ├── forgot-password.js # ลืมรหัสผ่าน
│   │   ├── reset-password.js  # ตั้งรหัสผ่านใหม่
│   │   ├── recipes.js    # จัดการสูตรอาหาร
│   │   ├── bookmarks.js  # บุคมาร์ก
│   │   ├── comments.js   # ความคิดเห็น
│   │   └── ...
│   ├── Login/            # หน้าเข้าสู่ระบบ
│   ├── recipes/          # หน้าแสดงสูตรอาหาร
│   ├── Profile/          # จัดการโปรไฟล์
│   └── ...
├── styles/               # CSS modules
│   ├── globals.css       # สไตล์พื้นฐานและ CSS variables
│   ├── Home.module.css   # หน้าหลัก
│   ├── Login/            # สไตล์หน้าเข้าสู่ระบบ
│   └── ...
├── public/               # ไฟล์สาธารณะ
│   ├── images/           # รูปภาพ
│   └── uploads/          # รูปภาพที่อัปโหลด
└── components/           # React components
```

## 🎨 ธีมและสไตล์

แอปพลิเคชันใช้ระบบ CSS Variables ที่ออกแบบมาให้สบายตา:

- **สีหลัก**: โทนฟ้าอ่อน (#0ea5e9)
- **สีรอง**: โทนเทาอ่อน (#f8fafc)
- **ฟอนต์**: Kanit (รองรับภาษาไทย)
- **การออกแบบ**: Modern, Clean, และ Responsive

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - เข้าสู่ระบบ
- `POST /api/register` - สมัครสมาชิก
- `POST /api/forgot-password` - ขอรหัส OTP
- `POST /api/reset-password` - ตั้งรหัสผ่านใหม่

### Recipes
- `GET /api/recipes` - ดึงรายการสูตรอาหาร
- `GET /api/recipes/[id]` - ดึงสูตรอาหารตาม ID
- `POST /api/recipes` - เพิ่มสูตรอาหารใหม่
- `PUT /api/recipes/[id]` - แก้ไขสูตรอาหาร
- `DELETE /api/recipes/[id]` - ลบสูตรอาหาร

### Bookmarks
- `GET /api/bookmarks` - ดึงบุคมาร์ก
- `POST /api/bookmarks` - เพิ่มบุคมาร์ก
- `DELETE /api/bookmarks` - ลบบุคมาร์ก

### Comments
- `GET /api/comments` - ดึงความคิดเห็น
- `POST /api/comments` - เพิ่มความคิดเห็น
- `DELETE /api/comments` - ลบความคิดเห็น

## 🔐 ระบบความปลอดภัย

- **JWT Authentication** - ระบบ token สำหรับการยืนยันตัวตน
- **Password Hashing** - รหัสผ่านถูกเข้ารหัส
- **Input Validation** - ตรวจสอบข้อมูลนำเข้า
- **SQL Injection Protection** - ป้องกันการโจมตีฐานข้อมูล

## 📱 Responsive Design

แอปพลิเคชันรองรับการใช้งานบน:
- 💻 Desktop
- 📱 Mobile
- 📱 Tablet

## 🚀 การ Deploy

### Vercel (แนะนำ)
```bash
npm install -g vercel
vercel
```

### การตั้งค่าสภาพแวดล้อม
สร้างไฟล์ `.env.local`:
```
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=food_recipes
```

## 🤝 การมีส่วนร่วม

1. Fork โปรเจกต์
2. สร้าง feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไป branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

## 📄 License

โปรเจกต์นี้ใช้ MIT License - ดูไฟล์ [LICENSE](LICENSE) สำหรับรายละเอียด

## 👥 ทีมพัฒนา

- **Frontend**: Next.js, React, CSS Modules
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **Styling**: Custom CSS Variables, Responsive Design

## 📞 การติดต่อ

หากมีคำถามหรือข้อเสนอแนะ กรุณาติดต่อทีมพัฒนา

---

**Made with ❤️ for healthy cooking**
