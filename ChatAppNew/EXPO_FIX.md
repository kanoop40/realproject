# 🔧 แก้ไข expo-notifications Error

## ❌ ปัญหา:
```
PluginError: Failed to resolve plugin for module "expo-notifications"
```

## ✅ วิธีแก้ไข:

### วิธีที่ 1: ใช้ Script (แนะนำ)
1. ดับเบิลคลิก `fix-expo.bat`
2. รอจนเสร็จ
3. รัน `npx expo start --tunnel`

### วิธีที่ 2: Manual Steps
```bash
# 1. ลบ dependencies เก่า
rm -rf node_modules package-lock.json

# 2. ติดตั้งใหม่
npm install

# 3. รันแอป
npx expo start --tunnel
```

### วิธีที่ 3: PowerShell
```powershell
# เปิด PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
cd "c:\Users\kanoo\Desktop\project\ChatApp\ChatAppNew"
.\fix-expo.ps1
```

## 📋 สิ่งที่แก้ไขแล้ว:

### 1. app.json
- ✅ ลบ expo-notifications plugin
- ✅ ลบ notification configuration
- ✅ ลบ UIBackgroundModes
- ✅ ลบ RECEIVE_BOOT_COMPLETED permission

### 2. package.json  
- ✅ ลบ expo-notifications dependency

### 3. notificationService.js
- ✅ ใช้ Alert แทน push notifications
- ✅ Mock functions สำหรับความเข้ากันได้

## 🚀 หลังแก้ไข:
- ❌ ไม่มี expo-notifications errors
- ✅ แอปรันได้ปกติ
- ✅ Read status system ทำงาน
- ✅ Chat animations ทำงาน

## 🔄 หากยังมีปัญหา:
1. ลบ Expo cache: `npx expo start --clear`
2. Restart Metro: `r` ใน terminal
3. รีสตาร์ท Expo Go app

**พร้อมใช้งาน! 🎉**
