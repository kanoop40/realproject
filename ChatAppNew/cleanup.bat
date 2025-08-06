@echo off
echo 🧹 Cleaning up React Native project...

REM ลบ node_modules
echo 📦 Removing node_modules...
if exist node_modules rmdir /s /q node_modules

REM ลบ package-lock.json 
echo 🔒 Removing package-lock.json...
if exist package-lock.json del package-lock.json

REM ติดตั้ง dependencies ใหม่
echo ⬇️ Installing dependencies...
npm install

REM เคลียร์ metro cache
echo 🚇 Clearing Metro cache...
npx expo start --clear

echo ✅ Cleanup completed! You can now run the app.
pause
