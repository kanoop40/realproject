require('dotenv').config();
const mongoose = require('mongoose');
const GroupChat = require('./models/GroupChatModel');
const User = require('./models/UserModel');

async function testGroupDetails() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ เชื่อมต่อ MongoDB Atlas สำเร็จ');
    
    // หากลุ่มล่าสุด
    const latestGroup = await GroupChat.findOne()
      .populate('creator', 'firstName lastName name email username')
      .populate('members.user', 'firstName lastName name email username')
      .sort({ createdAt: -1 });
    
    if (latestGroup) {
      console.log('\n=== ข้อมูลกลุ่มล่าสุด ===');
      console.log('ID:', latestGroup._id);
      console.log('Name:', latestGroup.name);
      console.log('Creator field:', latestGroup.creator);
      console.log('Creator populated:', latestGroup.creator ? {
        id: latestGroup.creator._id,
        name: latestGroup.creator.name || `${latestGroup.creator.firstName} ${latestGroup.creator.lastName}`,
        username: latestGroup.creator.username
      } : 'ไม่มีข้อมูล');
      
      console.log('\n=== สมาชิกในกลุ่ม ===');
      latestGroup.members.forEach((member, index) => {
        const user = member.user;
        console.log(`${index + 1}. ${user.name || `${user.firstName} ${user.lastName}`} (ID: ${user._id})`);
      });
      
      // ทดสอบ response ที่จะส่งกลับ
      const responseData = {
        ...latestGroup.toObject(),
        admin: latestGroup.creator // เพิ่ม admin field
      };
      
      console.log('\n=== Response Data ===');
      console.log('Admin field:', responseData.admin);
      console.log('Creator field:', responseData.creator);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testGroupDetails();
