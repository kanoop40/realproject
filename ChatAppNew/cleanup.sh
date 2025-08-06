#!/bin/bash

echo "🧹 Cleaning up React Native project..."

# ลบ node_modules
echo "📦 Removing node_modules..."
rm -rf node_modules

# ลบ package-lock.json 
echo "🔒 Removing package-lock.json..."
rm -f package-lock.json

# ลบ expo cache
echo "🗂️ Clearing Expo cache..."
npx expo install --fix

# ติดตั้ง dependencies ใหม่
echo "⬇️ Installing dependencies..."
npm install

# เคลียร์ metro cache
echo "🚇 Clearing Metro cache..."
npx expo start --clear

echo "✅ Cleanup completed! You can now run the app."
