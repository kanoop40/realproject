const mongoose = require('mongoose');
const GroupChat = require('./models/GroupChatModel');
const User = require('./models/UserModel');

mongoose.connect('mongodb://localhost:27017/chatapp');

async function checkAllData() {
  try {
    console.log('=== ตรวจสอบผู้ใช้ทั้งหมด ===');
    
    const allUsers = await User.find({}, 'firstName lastName name email username').limit(10);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.name || `${user.firstName} ${user.lastName}`}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log('');
    });
    
    console.log('=== ตรวจสอบกลุ่มทั้งหมด ===');
    
    const allGroups = await GroupChat.find({})
      .populate('creator', 'firstName lastName name email username')
      .populate('members.user', 'firstName lastName name email username')
      .sort({ createdAt: -1 })
      .limit(5);
    
    allGroups.forEach((group, index) => {
      console.log(`${index + 1}. กลุ่ม: ${group.name}`);
      console.log(`   สร้างเมื่อ: ${group.createdAt}`);
      console.log(`   ผู้สร้าง:`, group.creator ? {
        id: group.creator._id,
        name: group.creator.name || `${group.creator.firstName} ${group.creator.lastName}`,
        username: group.creator.username
      } : 'ไม่มีข้อมูล');
      console.log(`   จำนวนสมาชิก: ${group.members.length}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllData();
