const mongoose = require('mongoose');
const GroupChat = require('./models/GroupChatModel');
const User = require('./models/UserModel');

mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkGroupData() {
  try {
    console.log('=== ตรวจสอบข้อมูลกลุ่มล่าสุด ===');
    
    // หากลุ่มล่าสุด
    const latestGroup = await GroupChat.findOne()
      .populate('creator', 'firstName lastName name email username')
      .populate('members.user', 'firstName lastName name email username')
      .sort({ createdAt: -1 });
    
    if (latestGroup) {
      console.log('กลุ่มล่าสุด:', latestGroup.name);
      console.log('Creator field:', latestGroup.creator);
      console.log('Members count:', latestGroup.members.length);
      console.log('Members:', latestGroup.members.map(m => ({
        id: m.user._id,
        name: m.user.name || `${m.user.firstName} ${m.user.lastName}`,
        role: m.role
      })));
    }
    
    // หาผู้ใช้ชื่อกิตติทัต
    const kittitat = await User.findOne({
      $or: [
        { firstName: /กิตติทัต/i },
        { lastName: /กิตติทัต/i },
        { name: /กิตติทัต/i },
        { username: /กิตติทัต/i }
      ]
    });
    
    if (kittitat) {
      console.log('\n=== ข้อมูลผู้ใช้กิตติทัต ===');
      console.log('ID:', kittitat._id);
      console.log('Name:', kittitat.name || `${kittitat.firstName} ${kittitat.lastName}`);
      console.log('Username:', kittitat.username);
      console.log('Email:', kittitat.email);
      
      // หากลุ่มที่กิตติทัตสร้าง
      const kittitatsGroups = await GroupChat.find({ creator: kittitat._id })
        .populate('creator', 'firstName lastName name email username');
      
      console.log('\n=== กลุ่มที่กิตติทัตสร้าง ===');
      kittitatsGroups.forEach(group => {
        console.log(`- ${group.name} (สร้างเมื่อ: ${group.createdAt})`);
      });
      
      // ตรวจสอบว่ากิตติทัตอยู่ในกลุ่มล่าสุดหรือไม่
      if (latestGroup) {
        const isCreator = latestGroup.creator && latestGroup.creator._id.toString() === kittitat._id.toString();
        const isMember = latestGroup.members.some(m => m.user._id.toString() === kittitat._id.toString());
        
        console.log('\n=== สถานะของกิตติทัตในกลุ่มล่าสุด ===');
        console.log('เป็นผู้สร้าง:', isCreator);
        console.log('เป็นสมาชิก:', isMember);
      }
    } else {
      console.log('❌ ไม่พบผู้ใช้ชื่อกิตติทัต');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGroupData();
