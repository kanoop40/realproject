# การแก้ไขปัญหา Rate Limiting และการดาวน์โหลดไฟล์

## ปัญหาที่แก้ไข

### 1. Rate Limiting (429 Too Many Requests)
- เซิร์ฟเวอร์บล็อคการเรียก API เมื่อมีการร้องขอมากเกินไป
- ปัญหาใน adaptive sync ที่เรียก API บ่อยเกินไป
- ไม่มีการจัดการ retry และ exponential backoff

### 2. การดาวน์โหลดไฟล์บน Android
- ไฟล์ถูกแชร์แทนที่จะดาวน์โหลดลงเครื่อง
- ไม่มีตัวเลือกให้ผู้ใช้เลือกระหว่างแชร์และดาวน์โหลด
- ไม่ได้ใช้ AndroidDownloads utility ที่มีอยู่แล้ว

## การแก้ไข

### 1. Rate Limiting Protection

#### ใน `service/api.js`:
- เพิ่ม rate limiting helper functions:
  - `handleRateLimit()` - จัดการ retry time
  - `checkRateLimit()` - ตรวจสอบว่ายังอยู่ในช่วง rate limit หรือไม่
  - `trackRequest()` - ติดตามจำนวน requests ต่อนาที (สูงสุด 30 requests)

- ปรับ request interceptor:
  - ตรวจสอบ rate limit ก่อนส่ง request
  - Throttle requests เมื่อเกิน limit
  
- ปรับ response interceptor:
  - จัดการ HTTP 429 response
  - Auto-retry พร้อม exponential backoff

#### ใน Chat Screens:
- เพิ่ม `RateLimitStatus` component แสดงเวลาที่เหลือ
- ปรับ polling interval จาก 5 วินาที เป็น 10 วินาที
- เพิ่มการจัดการ rate limit error ใน adaptive sync
- เพิ่ม exponential backoff สำหรับ sync failures

### 2. การปรับปรุงการดาวน์โหลดไฟล์

#### ใน `FileMessage.js`:
- ไม่เปลี่ยนแปลง UI แต่ส่งข้อมูลไฟล์ไปยัง parent component

#### ใน `PrivateChatScreen.js` และ `GroupChatScreen.js`:
- เพิ่มฟังก์ชัน `showFileOptions()` แสดง Alert ให้เลือก:
  - **ยกเลิก**
  - **แชร์** (behavior เดิม)
  - **ดาวน์โหลด** (บันทึกลงเครื่อง)

- เพิ่มฟังก์ชัน `shareFile()` สำหรับแชร์ไฟล์
- ปรับปรุงฟังก์ชัน `downloadFile()` เพื่อบันทึกลงเครื่องจริง:
  - **Android**: ใช้ `AndroidDownloads.saveToDownloads()` บันทึกไปที่ Downloads folder
  - **iOS**: ใช้ Sharing API เหมือนเดิม
  - มี fallback เป็น sharing หาก Downloads save ล้มเหลว

## ไฟล์ที่แก้ไข

1. `service/api.js` - Rate limiting management
2. `screens/user/ChatScreen.js` - Rate limit status และ polling adjustment
3. `screens/user/PrivateChatScreen.js` - File options และ download improvements
4. `screens/user/GroupChatScreen.js` - File options และ download improvements

## คุณสมบัติใหม่

### Rate Limiting Protection
- ✅ Auto-detect และ handle HTTP 429
- ✅ Exponential backoff retry
- ✅ Request throttling (30 requests/minute)
- ✅ Real-time rate limit status display
- ✅ Reduced polling frequency (10s instead of 5s)

### File Download Improvements
- ✅ แยกตัวเลือก "แชร์" และ "ดาวน์โหลด"
- ✅ Android: บันทึกไฟล์ไปที่ Downloads folder โดยตรง
- ✅ iOS: ใช้ Sharing API เหมือนเดิม
- ✅ Fallback เป็น sharing หาก Downloads ล้มเหลว
- ✅ Success notification พร้อม Animation
- ✅ ใช้ AndroidDownloads utility ที่มีอยู่แล้ว

## การใช้งาน

### สำหรับผู้ใช้:
1. **แชร์ไฟล์**: กดไฟล์ → เลือก "แชร์" → เลือกแอปเพื่อแชร์
2. **ดาวน์โหลดไฟล์**: กดไฟล์ → เลือก "ดาวน์โหลด" → ไฟล์จะถูกบันทึกไปที่ Downloads (Android) หรือแชร์ (iOS)
3. **Rate Limit**: หากเกิด rate limit จะแสดงแถบสีส้มด้านบนพร้อมนับถอยหลัง

### สำหรับนักพัฒนา:
- Rate limiting จะทำงานอัตโนมัติ
- ไม่จำเป็นต้องเปลี่ยนแปลงโค้ดอื่น
- Log ทั้งหมดจะแสดงใน console สำหรับ debugging

## การทดสอบ

### Rate Limiting:
1. ทดลองเรียก API หลายครั้งติดต่อกัน
2. ตรวจสอบว่า rate limit status แสดงขึ้นเมื่อเกิด 429
3. ยืนยันว่า auto-retry ทำงาน

### File Download:
1. ส่งไฟล์ในแชท
2. กดไฟล์และทดสอบทั้ง "แชร์" และ "ดาวน์โหลด"
3. **Android**: ตรวจสอบใน Downloads folder
4. **iOS**: ตรวจสอบ sharing dialog

## หมายเหตุ

- การเปลี่ยนแปลงนี้เป็น backward compatible
- ไฟล์เก่าที่มีอยู่แล้วจะยังทำงานปกติ
- Rate limiting จะช่วยลดการใช้ server resources
- Download functionality ใช้ AndroidDownloads utility ที่มีอยู่แล้วใน project