const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('./models/UserModel');
require('dotenv').config();

const cleanOldAvatars = async () => {
    try {
        console.log('🧹 Starting cleanup of old avatars...');
        
        // เชื่อมต่อ MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        // หาผู้ใช้ทั้งหมดที่มี avatar
        const users = await User.find({ avatar: { $exists: true, $ne: null } });
        console.log(`👥 Found ${users.length} users with avatars`);
        
        // ดึงรายการไฟล์ในโฟลเดอร์ avatars
        const avatarDir = path.join(__dirname, 'uploads', 'avatars');
        const allFiles = fs.readdirSync(avatarDir).filter(file => file.endsWith('.jpg'));
        console.log(`📁 Found ${allFiles.length} avatar files`);
        
        // สร้างรายการ avatar ที่กำลังใช้งาน
        const usedAvatars = users
            .map(user => user.avatar)
            .filter(avatar => avatar)
            .map(avatar => path.basename(avatar));
        
        console.log(`🔗 ${usedAvatars.length} avatars currently in use`);
        console.log('Used avatars:', usedAvatars);
        
        // หาไฟล์ที่ไม่ได้ใช้งาน
        const unusedFiles = allFiles.filter(file => !usedAvatars.includes(file));
        
        console.log(`🗑️ Found ${unusedFiles.length} unused avatar files`);
        
        if (unusedFiles.length > 0) {
            console.log('Unused files:', unusedFiles);
            
            // ลบไฟล์ที่ไม่ได้ใช้งาน
            let deletedCount = 0;
            for (const file of unusedFiles) {
                try {
                    const filePath = path.join(avatarDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`✅ Deleted: ${file}`);
                    deletedCount++;
                } catch (error) {
                    console.error(`❌ Error deleting ${file}:`, error.message);
                }
            }
            
            console.log(`🎉 Cleanup completed! Deleted ${deletedCount} unused avatar files`);
        } else {
            console.log('✨ No unused avatar files found');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        mongoose.disconnect();
    }
};

// เรียกใช้ script
if (require.main === module) {
    cleanOldAvatars();
}

module.exports = cleanOldAvatars;
