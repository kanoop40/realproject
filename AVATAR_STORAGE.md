# Avatar Storage Solutions

## ปัญหาปัจจุบัน
- Render.com Free Tier มี ephemeral filesystem
- ไฟล์ avatar จะหายไปเมื่อ redeploy
- Static files ไม่สามารถจัดเก็บถาวรได้

## ทางแก้ปัญหา

### 1. ระยะสั้น (ปัจจุบัน)
- ใช้ initials แทน avatar ที่หายไป
- แสดงข้อความแจ้งเตือนผู้ใช้
- เพิ่ม fallback UI ที่ดีขึ้น

### 2. ระยะกลาง (แนะนำ)
**Cloudinary (Free tier: 25GB)**
```javascript
// ติดตั้ง: npm install cloudinary multer-storage-cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app-avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    transformation: [{ width: 200, height: 200, crop: 'fill' }]
  }
});
```

### 3. ระยะยาว
**AWS S3 หรือ Google Cloud Storage**
- เหมาะสำหรับ production
- มีค่าใช้จ่าย แต่เสถียร
- รองรับ CDN

## การติดตั้ง Cloudinary (แนะนำ)

1. สมัคร Cloudinary account (ฟรี)
2. ได้รับ credentials
3. แก้ไข backend:

```bash
cd backend
npm install cloudinary multer-storage-cloudinary
```

4. เพิ่มใน .env:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

5. แก้ไข upload middleware ใน backend
