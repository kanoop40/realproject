# 🔧 แก้ไขปัญหา Network Error สำหรับ File Upload บน Render

## ❌ ปัญหาที่พบ
```
LOG ❌ API Error: {"data": undefined, "message": "Network Error", "method": "post", "status": undefined, "url": "/groups/xxx/upload"}
ERROR ❌ Error sending file: [AxiosError: Network Error]
```

## 🔍 สาเหตุปัญหา
1. **Cold Start ของ Render** - Server ต้องใช้เวลา wake up
2. **Timeout สั้นเกินไป** - File upload ใช้เวลานาน
3. **Network instability** - การเชื่อมต่อไม่เสถียร
4. **Cloudinary limits** - File format restrictions

## ✅ การแก้ไขที่ทำ

### 1. เพิ่ม Timeout สำหรับ API
```javascript
// api.js - เพิ่ม timeout เป็น 60 วินาที
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000, // เพิ่มจาก 30 เป็น 60 วินาที
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 2. ปรับปรุง Retry Logic
```javascript
// api.js - เพิ่ม retry สำหรับ Network Error
if ((error.code === 'ECONNABORTED' || 
     error.message.includes('timeout') || 
     error.message.includes('Network Error')) && 
    !originalRequest._retry) {
  
  const isFileUpload = originalRequest.headers['Content-Type']?.includes('multipart/form-data');
  const waitTime = isFileUpload ? 8000 : 3000; // รอนานขึ้นสำหรับ file upload
  
  await new Promise(resolve => setTimeout(resolve, waitTime));
  return api(originalRequest);
}
```

### 3. เพิ่ม Timeout เฉพาะสำหรับ File Upload
```javascript
// GroupChatScreen.js - timeout 2 นาทีสำหรับแต่ละ upload
const response = await api.post(`/groups/${groupId}/upload`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  timeout: 120000, // 2 minutes timeout
});
```

### 4. แก้ไข Cloudinary Configuration
```javascript
// config/cloudinary.js - เอา allowed_formats ออกเพื่อรองรับไฟล์ทุกประเภท
const fileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app-files',
    resource_type: 'auto', // รองรับไฟล์ทุกประเภท
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1E9);
      return `file-${timestamp}-${randomNum}`;
    }
  }
});
```

### 5. ปรับปรุง Error Handling
```javascript
// GroupChatScreen.js - Error messages ที่ชัดเจนขึ้น
let errorMessage = 'ไม่สามารถส่งไฟล์ได้';
if (error.message.includes('Network Error')) {
  errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง';
} else if (error.message.includes('timeout')) {
  errorMessage = 'การส่งไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่';
}
```

### 6. เพิ่ม Debug Logging
```javascript
// groupChatController.js - เพิ่ม logging สำหรับ debug
console.log('📨 Group message request received:', {
  groupId,
  content: content ? content.substring(0, 50) : 'No content',
  hasFile: !!req.file,
  fileInfo: req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  } : null
});
```

## 🚀 การปรับปรุงประสิทธิภาพ

### Timeout Configuration
- **API Global**: 60 วินาที
- **File Upload**: 120 วินาที (2 นาที)
- **Retry Wait**: 8 วินาทีสำหรับ file upload, 3 วินาทีสำหรับ request ปกติ

### Network Resilience
- ✅ Auto retry สำหรับ Network Error
- ✅ Auto retry สำหรับ Timeout
- ✅ Cold start handling
- ✅ Different wait times สำหรับ file vs text

### User Experience
- ✅ Error messages ที่เข้าใจง่าย
- ✅ Loading indicators
- ✅ Temporary message removal on error
- ✅ Better error differentiation

## 🎯 การทดสอบ

### 1. ทดสอบ Cold Start
- เปิดแอปหลังจาก server ไม่ได้ใช้งานนาน
- ส่งไฟล์ → ควร retry และสำเร็จ

### 2. ทดสอบ Large Files
- ส่งไฟล์ขนาดใหญ่ (5-10MB)
- ควรมี timeout ที่เพียงพอ

### 3. ทดสอบ Network Issues
- ปิด/เปิด WiFi ระหว่างส่งไฟล์
- ควรมี error message ที่เหมาะสม

### 4. ทดสอบ File Types
- ส่งรูปภาพ: JPG, PNG, GIF
- ส่งไฟล์: PDF, DOC, TXT
- ควรทำงานกับไฟล์ทุกประเภท

## 📱 Render Deployment Considerations

### Server Configuration
- ✅ Environment variables set correctly
- ✅ CORS configured for mobile apps
- ✅ MongoDB connection stable
- ✅ Cloudinary integration working

### Performance Optimization
- ✅ Longer timeouts for file operations
- ✅ Auto-retry for cold starts
- ✅ Resource type auto-detection
- ✅ Optimized file naming

## 🔒 Security & Limits
- ✅ File size limit: 50MB
- ✅ Authentication required
- ✅ Member validation
- ✅ Cloudinary secure storage
- ✅ Error message sanitization

## 📝 หมายเหตุ
- การแก้ไขเหล่านี้ช่วยจัดการกับปัญหา Network Error ที่เกิดจาก Render cold start
- Timeout ที่นานขึ้นจะช่วยให้ file upload สำเร็จมากขึ้น
- Retry logic จะทำให้ UX ดีขึ้นเมื่อมีปัญหาเครือข่าย
- Error messages ที่ชัดเจนจะช่วยให้ผู้ใช้เข้าใจปัญหา
