const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/chatapp');
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n=== Collections ที่มีอยู่ ===');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });
    
    // ตรวจสอบจำนวนข้อมูลในแต่ละ collection
    for (const col of collections) {
      if (['users', 'groupchats', 'messages'].includes(col.name)) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`${col.name}: ${count} records`);
      }
    }
    
    // ลองดึงข้อมูล users ตัวอย่าง
    const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
    if (sampleUsers.length > 0) {
      console.log('\n=== ตัวอย่าง Users ===');
      sampleUsers.forEach(user => {
        console.log(`${user.firstName} ${user.lastName} (${user.username})`);
      });
    }
    
    // ลองดึงข้อมูล groups ตัวอย่าง
    const sampleGroups = await db.collection('groupchats').find({}).limit(3).toArray();
    if (sampleGroups.length > 0) {
      console.log('\n=== ตัวอย่าง Groups ===');
      sampleGroups.forEach(group => {
        console.log(`${group.name} - Creator: ${group.creator}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testConnection();
