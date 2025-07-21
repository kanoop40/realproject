# ChatApp Backend

ระบบแชทสำหรับมหาวิทยาลัย รองรับการแชทระหว่างนักศึกษา อาจารย์ และบุคลากร

## 🚀 Features

### 1. การยืนยันตัวตน
- ✅ ล็อกอินด้วยรหัสนักศึกษา/พนักงาน
- ✅ JWT Authentication
- ✅ Role-based access control (student, teacher, staff, admin)

### 2. การแชทส่วนตัว
- ✅ สร้างห้องแชทส่วนตัว
- ✅ ส่งข้อความและไฟล์ (PDF, Word, รูปภาพ)
- ✅ ลบข้อความที่ส่งแล้ว
- ✅ แสดงสถานะอ่าน/ยังไม่อ่าน
- ✅ Real-time messaging with Socket.IO
- ✅ ลบห้องแชท

### 3. กลุ่มแชท
- ✅ สร้างกลุ่มได้ (อาจารย์/เจ้าหน้าที่เท่านั้น)
- ✅ มีรูปกลุ่มและชื่อกลุ่ม
- ✅ ระบบลบกลุ่ม/ลบสมาชิก
- ✅ เชิญสมาชิกเข้ากลุ่มอัตโนมัติตาม:
  - ห้องเรียน (groupCode)
  - รหัสนักศึกษา (pattern matching)
  - คณะ (faculty)
  - หน่วยงาน (department)
- ✅ แสดงจำนวนสมาชิกในกลุ่ม

### 4. การจัดการไฟล์
- ✅ รองรับไฟล์ PDF, Word, รูปภาพ
- ✅ ขนาดไฟล์สูงสุด 50MB
- ✅ จัดเก็บไฟล์อัปโหลด

### 5. โปรไฟล์ผู้ใช้
- ✅ แสดงชื่อ-นามสกุล, ห้องเรียน, หน่วยงาน/คณะ
- ✅ รหัสประจำตัว (นักศึกษา/พนักงาน)
- ✅ รูปภาพโปรไฟล์
- ✅ สถานะออนไลน์/ออฟไลน์

### 6. การค้นหา
- ✅ ค้นหาผู้ใช้ในระบบ
- ✅ ค้นหากลุ่ม

### 7. การแจ้งเตือน
- ✅ แจ้งเตือนข้อความใหม่
- ✅ แจ้งเตือนเชิญเข้ากลุ่ม
- ✅ Real-time notifications

### 8. ระบบผู้ดูแล
- ✅ สร้าง/แก้ไข/ลบบัญชีผู้ใช้
- ✅ จัดการสิทธิ์ผู้ใช้

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

## 📦 Installation

### Local Development

1. **Clone และติดตั้ง dependencies**
```bash
cd backend
npm install
```

2. **สร้างไฟล์ .env**
```bash
cp .env.example .env
# แก้ไขค่าใน .env ตามต้องการ
```

3. **สร้าง Admin User**
```bash
node scripts/createAdmin.js
```

4. **สร้าง Test Users (Optional)**
```bash
node scripts/createTestUsers.js
```

5. **รันเซิร์ฟเวอร์**
```bash
# Development
npm run dev

# Production
npm start
```

### Deploy บน Vercel

1. **ติดตั้ง Vercel CLI**
```bash
npm i -g vercel
```

2. **Login Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **ตั้งค่า Environment Variables ใน Vercel Dashboard**
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret key
- `NODE_ENV`: production

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน

### Users Management
- `GET /api/users` - ดึงรายการผู้ใช้ (Admin)
- `GET /api/users/search` - ค้นหาผู้ใช้
- `GET /api/users/:id` - ดึงข้อมูลผู้ใช้
- `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้ (Admin)

### Chat (Private)
- `GET /api/chats` - ดึงรายการแชท
- `POST /api/chats` - สร้างห้องแชทใหม่
- `GET /api/chats/:id/messages` - ดึงข้อความในแชท
- `POST /api/chats/:id/messages` - ส่งข้อความ (รองรับไฟล์)
- `DELETE /api/chats/messages/:id` - ลบข้อความ
- `POST /api/chats/messages/:id/read` - ทำเครื่องหมายอ่านแล้ว
- `GET /api/chats/:id/unread-count` - จำนวนข้อความที่ยังไม่อ่าน
- `DELETE /api/chats/:id` - ลบห้องแชท

### Groups
- `GET /api/groups` - ดึงรายการกลุ่ม
- `POST /api/groups` - สร้างกลุ่มใหม่
- `GET /api/groups/:id` - ดึงข้อมูลกลุ่ม
- `DELETE /api/groups/:id` - ลบกลุ่ม
- `POST /api/groups/:id/invite` - เชิญสมาชิก
- `DELETE /api/groups/:id/members/:userId` - ลบสมาชิก
- `POST /api/groups/:id/leave` - ออกจากกลุ่ม
- `PUT /api/groups/:id/auto-invite` - ตั้งค่า Auto Invite

### Notifications
- `GET /api/notifications` - ดึงการแจ้งเตือน
- `PUT /api/notifications/:id/read` - ทำเครื่องหมายอ่านแล้ว
- `DELETE /api/notifications/:id` - ลบการแจ้งเตือน
- `GET /api/notifications/unread-count` - จำนวนการแจ้งเตือนที่ยังไม่อ่าน

## 🔧 Socket.IO Events

### Client to Server
- `join` - เข้าร่วมระบบ
- `join_chat` - เข้าร่วมห้องแชท
- `leave_chat` - ออกจากห้องแชท
- `send_message` - ส่งข้อความ
- `typing` - กำลังพิมพ์
- `message_read` - อ่านข้อความ

### Server to Client
- `receive_message` - รับข้อความใหม่
- `user_typing` - ผู้ใช้กำลังพิมพ์
- `message_read_update` - อัพเดทสถานะอ่าน
- `user_online` - ผู้ใช้ออนไลน์
- `user_offline` - ผู้ใช้ออฟไลน์
- `receive_notification` - รับการแจ้งเตือน

## 🗃 Database Schema

### User
- `username` - ชื่อผู้ใช้ (unique)
- `password` - รหัสผ่าน (hashed)
- `email` - อีเมล (unique)
- `firstName`, `lastName` - ชื่อ-นามสกุล
- `faculty` - คณะ
- `department` - หน่วยงาน
- `major` - สาขาวิชา (นักศึกษา)
- `groupCode` - ห้องเรียน
- `studentId` - รหัสนักศึกษา
- `employeeId` - รหัสพนักงาน
- `role` - บทบาท (student/teacher/staff/admin)
- `avatar` - รูปโปรไฟล์
- `isOnline` - สถานะออนไลน์
- `lastSeen` - เวลาที่เข้าใช้ล่าสุด

### Messages
- `chat_id` - ID ห้องแชท
- `group_id` - ID กลุ่ม (สำหรับกลุ่มแชท)
- `user_id` - ID ผู้ส่ง
- `content` - เนื้อหาข้อความ
- `messageType` - ประเภทข้อความ (text/file/image)
- `file_id` - ID ไฟล์ (ถ้ามี)
- `readBy` - รายการผู้อ่าน
- `isDeleted` - สถานะลบ
- `time` - เวลาส่ง

### GroupChat
- `groupName` - ชื่อกลุ่ม
- `groupImage` - รูปกลุ่ม
- `creator` - ผู้สร้างกลุ่ม
- `members` - รายการสมาชิก
- `autoInviteSettings` - การตั้งค่าเชิญอัตโนมัติ
- `settings` - การตั้งค่ากลุ่ม

## 🔒 Security Features

- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Rate Limiting
- ✅ CORS Protection
- ✅ Helmet Security Headers
- ✅ File Type Validation
- ✅ Input Validation

## 📱 Platform Support

- ✅ Web Application
- ✅ Mobile (React Native/Expo)
- ✅ Real-time Updates
- ✅ Cross-platform compatibility

## 🚀 Performance

- ✅ Database Indexing
- ✅ Efficient Queries
- ✅ File Size Limits
- ✅ Connection Pooling
- ✅ Error Handling

## 🎯 Future Enhancements

- [ ] Message Encryption
- [ ] Video/Voice Calls
- [ ] Message Reactions
- [ ] File Preview
- [ ] Advanced Search
- [ ] Message Threads
- [ ] Admin Dashboard
- [ ] Analytics

## 📞 Support

สำหรับการสนับสนุนหรือข้อสงสัย กรุณาติดต่อทีมพัฒนา

---

**ChatApp Backend v2.0.0** - University Chat System
