# ChatApp Backend

ระบบแชทสำหรับมหาวิทยาลัย รองรับการแชทระหว่างนักศึกษา อาจารย์ และบุคลากร

## ✨ Features

### 🔐 Authentication & Authorization
- ระบบล็อกอินด้วยรหัสนักศึกษา/พนักงาน
- JWT Authentication
- Role-based access control (student, teacher, staff, admin)

### 💬 Chat System
- แชทส่วนตัวระหว่าง 2 คน
- กลุ่มแชทสำหรับหลายคน
- Real-time messaging ด้วย Socket.IO
- ระบบอ่านแล้ว/ยังไม่อ่าน
- ลบข้อความได้
- ลบห้องแชทได้

### 👥 Group Chat Features
- สร้างกลุ่มได้ (เฉพาะอาจารย์/เจ้าหน้าที่)
- อัปโหลดรูปกลุ่ม
- ระบบเชิญสมาชิกอัตโนมัติตาม:
  - ห้องเรียน
  - รหัสนักศึกษา
  - คณะ/หน่วยงาน
- จัดการสมาชิกกลุ่ม (เพิ่ม/ลบ)
- แสดงจำนวนสมาชิก

### 📎 File Sharing
- ส่งไฟล์ได้ไม่จำกัดเวลา
- รองรับ PDF, Word, รูปภาพ
- ขนาดไฟล์สูงสุด 50MB

### 👤 User Profile
- แสดงชื่อ-นามสกุล
- ห้องเรียน
- หน่วยงาน/คณะ
- รหัสประจำตัว
- รูปภาพโปรไฟล์

### 🔔 Notifications
- แจ้งเตือนทันทีสำหรับทุกข้อความ
- ไม่ต้องเป็นเพื่อนก่อน
- Real-time notifications

### 🔍 Search System
- ค้นหาผู้ใช้ในระบบได้
- ค้นหากลุ่มแชท

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting

## 🚀 Deployment on Render

### Prerequisites
1. สร้างบัญชี [Render](https://render.com)
2. เตรียม MongoDB Atlas database
3. เตรียม GitHub repository

### Step 1: เตรียม Repository

1. **Push โปรเจคขึ้น GitHub:**
```bash
# ถ้ายังไม่ได้ init git
git init
git add .
git commit -m "Initial backend setup for Render deployment"

# เพิ่ม remote repository
git remote add origin https://github.com/your-username/chatapp-backend.git
git push -u origin main
```

### Step 2: สร้าง Web Service บน Render

1. เข้า [Render Dashboard](https://dashboard.render.com)
2. คลิก **"New +"** → **"Web Service"**
3. เลือก **"Build and deploy from a Git repository"**
4. เชื่อมต่อ GitHub account และเลือก repository
5. กำหนดค่าต่อไปนี้:

**Basic Settings:**
- **Name**: `chatapp-backend` (หรือชื่อที่ต้องการ)
- **Environment**: `Node`
- **Region**: `Singapore` (ใกล้ประเทศไทยที่สุด)
- **Branch**: `main`
- **Root Directory**: ปล่อยว่าง (ถ้าไฟล์อยู่ใน root) หรือ `backend` (ถ้าอยู่ในโฟลเดอร์)

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Environment Variables

ใน Render Dashboard → Advanced → **Environment Variables** เพิ่ม:

```bash
# จำเป็น (Required)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-make-it-very-long-and-complex-at-least-32-characters
NODE_ENV=production

# ไม่บังคับ (Optional - มีค่า default แล้ว)
PORT=5000
JWT_EXPIRE=30d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
MAX_FILE_SIZE_MB=50
FRONTEND_URL=https://your-frontend-app.com
ALLOWED_ORIGINS=https://your-frontend-app.com,http://localhost:19006
SOCKET_CORS_ORIGIN=https://your-frontend-app.com
```

### Step 4: Deploy

1. คลิก **"Create Web Service"**
2. Render จะ build และ deploy อัตโนมัติ
3. รอประมาณ 5-10 นาที จนสถานะเป็น **"Live"**

### Step 5: ทดสอบ

เมื่อ deploy สำเร็จ จะได้ URL เช่น: `https://chatapp-backend.onrender.com`

ทดสอบ API:
```bash
# Health check
curl https://chatapp-backend.onrender.com/api/health

# API info  
curl https://chatapp-backend.onrender.com/
```

## 📦 API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/me` - ดูข้อมูลผู้ใช้ปัจจุบัน

### Users
- `GET /api/users` - ค้นหาผู้ใช้
- `GET /api/users/:id` - ดูข้อมูลผู้ใช้
- `PUT /api/users/profile` - แก้ไขโปรไฟล์
- `POST /api/users/avatar` - อัปโหลดรูปโปรไฟล์

### Chats
- `GET /api/chats` - ดูรายการแชท
- `POST /api/chats` - สร้างแชทใหม่
- `GET /api/chats/:id/messages` - ดูข้อความในแชท
- `POST /api/chats/:id/messages` - ส่งข้อความ
- `DELETE /api/chats/messages/:id` - ลบข้อความ
- `DELETE /api/chats/:id` - ลบห้องแชท

### Groups
- `GET /api/groups` - ดูรายการกลุ่ม
- `POST /api/groups` - สร้างกลุ่มใหม่
- `GET /api/groups/:id` - ดูข้อมูลกลุ่ม
- `POST /api/groups/:id/invite` - เชิญสมาชิก
- `DELETE /api/groups/:id/members/:userId` - ลบสมาชิก
- `DELETE /api/groups/:id` - ลบกลุ่ม

### Notifications
- `GET /api/notifications` - ดูการแจ้งเตือน
- `PUT /api/notifications/:id/read` - ทำเครื่องหมายอ่านแล้ว
- `DELETE /api/notifications/:id` - ลบการแจ้งเตือน

## 🔧 Local Development

```bash
# Clone repository
git clone https://github.com/your-username/chatapp-backend.git
cd chatapp-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
# Start development server
npm run dev

# Create admin user
npm run create-admin

# Create test users
npm run create-test-users
```

## 📝 User Roles

### 🎓 Student (นักศึกษา)
- เข้าระบบด้วยรหัสนักศึกษา
- แชทส่วนตัวและกลุ่ม
- ส่งข้อความและไฟล์
- ลบข้อความของตัวเอง
- แก้ไขโปรไฟล์ตนเอง
- ค้นหาผู้ใช้อื่น

### 👨‍🏫 Teacher (อาจารย์)
- เข้าระบบด้วยรหัสพนักงาน
- ทุกอย่างเหมือนนักศึกษา
- **เพิ่มเติม**: สร้างกลุ่มได้
- **เพิ่มเติม**: ตั้งค่า Auto Invite ได้

### 👥 Staff (เจ้าหน้าที่/บุคลากร)
- เข้าระบบด้วยรหัสพนักงาน
- ทุกอย่างเหมือนอาจารย์

### 🔧 Admin (ผู้ดูแลระบบ)
- สร้าง/แก้ไข/ลบบัญชีผู้ใช้
- จัดการระบบทั้งหมด
- ส่งการแจ้งเตือนระบบ

## 🔒 Security Features

- **Helmet**: ป้องกัน security vulnerabilities
- **Rate Limiting**: จำกัดจำนวน requests
- **CORS**: ควบคุมการเข้าถึงจาก domain อื่น
- **JWT**: Authentication ที่ปลอดภัย
- **Input Validation**: ตรวจสอบข้อมูลที่เข้ามา
- **File Upload Security**: จำกัดประเภทและขนาดไฟล์

## 🔧 Scripts

```bash
# Development
npm run dev          # รัน server ใน development mode

# Production  
npm start           # รัน server ใน production mode

# Database Management
npm run create-admin      # สร้าง admin user
npm run create-test-users # สร้าง test users
npm run reset-admin       # รีเซ็ต admin password
```

## 🚨 Important Notes สำหรับ Render

### 1. Database Setup
- ใช้ **MongoDB Atlas** (ฟรี 512MB)
- **อย่าใช้** local MongoDB
- ตั้งค่า IP Whitelist เป็น `0.0.0.0/0` ใน MongoDB Atlas

### 2. Environment Variables
- `MONGO_URI` **จำเป็น** - MongoDB connection string
- `JWT_SECRET` **จำเป็น** - ต้องยาวมากกว่า 32 ตัวอักษร
- `NODE_ENV=production` **จำเป็น**

### 3. File Storage
- ไฟล์อัปโหลดจะหายหลัง deploy ใหม่
- ควรใช้ cloud storage เช่น AWS S3, Cloudinary

### 4. Performance
- Render free tier จะ sleep หลัง 15 นาทีไม่ใช้งาน
- Cold start ใช้เวลา 30-60 วินาที
- ควร upgrade เป็น paid plan สำหรับ production

## 🐛 Troubleshooting

### 1. Build Failed
```bash
# ตรวจสอบ package.json
# ตรวจสอบ Node.js version compatibility
# ดู build logs ใน Render Dashboard
```

### 2. Database Connection Error
```bash
# ตรวจสอบ MONGO_URI format
# ตรวจสอบ MongoDB Atlas IP whitelist
# ตรวจสอบ username/password
```

### 3. CORS Error
```bash
# เพิ่ม frontend URL ใน ALLOWED_ORIGINS
# ตรวจสอบ protocol (http vs https)
```

### 4. Environment Variables
```bash
# ตรวจสอบใน Render Dashboard → Environment Variables
# ห้ามมี space หรือ quotes เกิน
# Redeploy หลังจากเปลี่ยน env vars
```

