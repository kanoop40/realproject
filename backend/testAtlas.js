require('dotenv').config();
const mongoose = require('mongoose');

async function testAtlasConnection() {
  try {
    console.log('🔄 กำลังเชื่อมต่อ MongoDB Atlas...');
    console.log('MONGO_URI:', process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ เชื่อมต่อ MongoDB Atlas สำเร็จ');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n=== Collections ที่มีอยู่ ===');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });
    
    // ตรวจสอบจำนวนข้อมูล
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`${col.name}: ${count} records`);
      
      if (col.name === 'users' && count > 0) {
        const sampleUsers = await db.collection('users').find({}).limit(5).toArray();
        console.log('\n=== ตัวอย่าง Users ===');
        sampleUsers.forEach(user => {
          console.log(`- ${user.firstName} ${user.lastName} (${user.username}) ID: ${user._id}`);
        });
      }
      
      if (col.name === 'groupchats' && count > 0) {
        const sampleGroups = await db.collection('groupchats').find({}).sort({createdAt: -1}).limit(5).toArray();
        console.log('\n=== ตัวอย่าง Groups (ล่าสุด) ===');
        sampleGroups.forEach(group => {
          console.log(`- ${group.name} (Creator: ${group.creator}) สร้างเมื่อ: ${group.createdAt}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testAtlasConnection();
