const mongoose = require('mongoose');
const Chat = require('../src/models/Chat');
const config = require('../src/config');

// เชื่อมต่อ MongoDB
mongoose.connect(config.MONGODB_URI || 'mongodb://localhost:27017/chat_test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ฟังก์ชันทดสอบสร้าง private chat
async function testCreatePrivateChat() {
  try {
    // สร้าง chat ใหม่
    const newChat = new Chat({
      participants: [
        new mongoose.Types.ObjectId(), // สมมติ user1
        new mongoose.Types.ObjectId()  // สมมติ user2
      ],
      chatType: 'private',
      messages: [{
        sender: new mongoose.Types.ObjectId(), // สมมติ sender
        content: 'ทดสอบส่งข้อความ',
        messageType: 'text'
      }]
    });

    // บันทึกลง database
    const savedChat = await newChat.save();
    console.log('บันทึก Private Chat สำเร็จ:', savedChat);

    // ค้นหา chat ที่เพิ่งสร้าง
    const foundChat = await Chat.findById(savedChat._id)
      .populate('messages.sender');
    console.log('ค้นหา Chat สำเร็จ:', foundChat);

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
}

// ฟังก์ชันทดสอบสร้าง group chat
async function testCreateGroupChat() {
  try {
    const groupAdmin = new mongoose.Types.ObjectId(); // สมมติ admin
    
    const newChat = new Chat({
      participants: [
        groupAdmin,
        new mongoose.Types.ObjectId(), // สมมติ user1
        new mongoose.Types.ObjectId()  // สมมติ user2
      ],
      chatType: 'group',
      chatName: 'กลุ่มทดสอบ',
      groupAdmin: groupAdmin,
      messages: [{
        sender: groupAdmin,
        content: 'ยินดีต้อนรับสู่กลุ่ม',
        messageType: 'text'
      }]
    });

    const savedChat = await newChat.save();
    console.log('บันทึก Group Chat สำเร็จ:', savedChat);

    const foundChat = await Chat.findById(savedChat._id)
      .populate('participants')
      .populate('groupAdmin')
      .populate('messages.sender');
    console.log('ค้นหา Group Chat สำเร็จ:', foundChat);

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
}

// รันการทดสอบ
async function runTests() {
  console.log('เริ่มการทดสอบ...');
  
  await testCreatePrivateChat();
  await testCreateGroupChat();
  
  // ปิดการเชื่อมต่อ
  await mongoose.connection.close();
  console.log('จบการทดสอบ');
}

runTests();