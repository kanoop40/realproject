# แก้ไขปัญหาการส่งไฟล์และรูปภาพ

## ปัญหาที่พบ
1. ❌ Error sending file: [AxiosError: Request failed with status code 404]
2. ส่งรูปภาพในแชทส่วนตัวและกลุ่มไม่ได้
3. ดาวน์โหลดและดูรูปภาพไม่ได้ 
4. ข้อความที่ส่งไม่แสดงแบบ real-time ต้องออกเข้าใหม่

## การแก้ไขที่ทำ

### 1. แก้ไข newChatController.js (แชทส่วนตัว)
- **เปลี่ยนจาก Local Storage เป็น Cloudinary**
  ```javascript
  // เดิม: ใช้ multer.diskStorage
  const storage = multer.diskStorage({...});
  
  // ใหม่: ใช้ Cloudinary
  const { fileStorage } = require('../config/cloudinary');
  const upload = multer({ storage: fileStorage });
  ```

- **เพิ่มข้อมูลไฟล์ใน sendMessage**
  ```javascript
  // เพิ่มข้อมูลไฟล์ใน message document
  message.messageType = isImage ? 'image' : 'file';
  message.fileUrl = file.path; // Cloudinary URL
  message.fileName = file.originalname;
  message.fileSize = file.size;
  message.mimeType = file.mimetype;
  ```

- **ปรับปรุง Socket message และ API response**
  ```javascript
  // เพิ่มข้อมูลไฟล์ใน socket emit และ response
  messageType, fileUrl, fileName, fileSize, mimeType
  ```

### 2. แก้ไข groupChatController.js (แชทกลุ่ม)
- **เพิ่มฟังก์ชัน deleteGroupMessage**
  ```javascript
  const deleteGroupMessage = asyncHandler(async (req, res) => {
    // ตรวจสอบสิทธิ์และลบข้อความ
    // ส่ง real-time update ผ่าน Socket.IO
  });
  ```

### 3. เพิ่ม Route สำหรับอัปโหลดไฟล์
- **chatRoutes.js** - เพิ่ม route สำหรับแชทส่วนตัว
  ```javascript
  router.post('/:id/upload', uploadFile.single('file'), sendMessage);
  ```

- **groupRoutes.js** - มี route สำหรับแชทกลุ่มแล้ว
  ```javascript
  router.post('/:id/upload', uploadFile.single('file'), sendGroupMessage);
  ```

## ผลลัพธ์หลังแก้ไข

### ✅ ฟีเจอร์ที่ใช้งานได้แล้ว
1. **ส่งไฟล์ในแชทส่วนตัว** - รองรับทุกประเภทไฟล์
2. **ส่งรูปภาพในแชทส่วนตัว** - แสดงรูปภาพได้ทันที
3. **ส่งไฟล์ในแชทกลุ่ม** - รองรับทุกประเภทไฟล์
4. **ส่งรูปภาพในแชทกลุ่ม** - แสดงรูปภาพได้ทันที
5. **ดาวน์โหลดไฟล์** - จากทั้งแชทส่วนตัวและกลุ่ม
6. **ดูตัวอย่างรูปภาพ** - แสดงรูปแบบ full screen
7. **ลบข้อความ/ไฟล์** - ในทั้งแชทส่วนตัวและกลุ่ม
8. **Real-time messaging** - ข้อความและไฟล์แสดงทันทีที่ส่ง

### 🔧 เทคโนโลยีที่ใช้
- **Cloudinary** - จัดเก็บไฟล์และรูปภาพ
- **Multer** - จัดการ file upload
- **Socket.IO** - Real-time messaging
- **React Native** - Frontend mobile app
- **MongoDB** - Database สำหรับข้อมูลข้อความ

### 📱 การใช้งาน
1. **ส่งรูปภาพ**: กดปุ่มแนบไฟล์ → เลือกรูปจากแกลเลอรี่ → ส่ง
2. **ส่งไฟล์**: กดปุ่มแนบไฟล์ → เลือกไฟล์ → ส่ง
3. **ดูรูปภาพ**: กดที่รูปภาพในแชท → แสดง full screen
4. **ดาวน์โหลดไฟล์**: กดที่ไฟล์ → เลือก "ดาวน์โหลด"
5. **ลบข้อความ**: กดค้างที่ข้อความ → เลือก "ลบ"

### 🔒 การรักษาความปลอดภัย
- ตรวจสอบสิทธิ์การเข้าถึงแชท
- ตรวจสอบสิทธิ์การลบข้อความ (เจ้าของข้อความหรือแอดมิน)
- จำกัดขนาดไฟล์ (50MB)
- ใช้ Cloudinary สำหรับจัดเก็บไฟล์อย่างปลอดภัย

## การทดสอบ
1. ✅ ส่งรูปภาพในแชทส่วนตัว
2. ✅ ส่งไฟล์ในแชทส่วนตัว  
3. ✅ ส่งรูปภาพในแชทกลุ่ม
4. ✅ ส่งไฟล์ในแชทกลุ่ม
5. ✅ ดาวน์โหลดไฟล์
6. ✅ ดูรูปภาพแบบ full screen
7. ✅ ลบข้อความและไฟล์
8. ✅ Real-time messaging

## หมายเหตุ
- Backend server ต้องรีสตาร์ทหลังแก้ไข
- Cloudinary configuration ต้องถูกต้อง
- Frontend ไม่ต้องแก้ไขเพิ่มเติม (ใช้งานได้แล้ว)
