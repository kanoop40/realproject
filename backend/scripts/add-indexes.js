const mongoose = require('mongoose');
require('dotenv').config();

// เชื่อมต่อกับ MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const addIndexes = async () => {
  try {
    await connectDB();
    
    console.log('🔧 Adding database indexes for performance...');
    
    const db = mongoose.connection.db;
    
    // เพิ่ม compound index สำหรับ participants field ใน chatrooms
    try {
      await db.collection('chatrooms').createIndex(
        { participants: 1 },
        { 
          name: 'participants_1',
          background: true 
        }
      );
      console.log('✅ Created index: participants_1 on chatrooms');
    } catch (error) {
      console.log('ℹ️ Index participants_1 already exists');
    }

    // เพิ่ม compound index สำหรับการค้นหา participants + size
    try {
      await db.collection('chatrooms').createIndex(
        { participants: 1, createdAt: -1 },
        { 
          name: 'participants_createdAt',
          background: true 
        }
      );
      console.log('✅ Created index: participants_createdAt on chatrooms');
    } catch (error) {
      console.log('ℹ️ Index participants_createdAt already exists');
    }

    // เพิ่ม index สำหรับ user lookups
    try {
      await db.collection('users').createIndex(
        { _id: 1, firstName: 1, lastName: 1 },
        { 
          name: 'user_basic_info',
          background: true 
        }
      );
      console.log('✅ Created index: user_basic_info on users');
    } catch (error) {
      console.log('ℹ️ Index user_basic_info already exists');
    }

    // เพิ่ม index สำหรับ messages
    try {
      await db.collection('messages').createIndex(
        { chatroom_id: 1, timestamp: -1 },
        { 
          name: 'chatroom_timestamp',
          background: true 
        }
      );
      console.log('✅ Created index: chatroom_timestamp on messages');
    } catch (error) {
      console.log('ℹ️ Index chatroom_timestamp already exists');
    }

    console.log('🎉 All indexes created successfully!');
    
    // แสดงรายการ indexes ทั้งหมด
    console.log('\n📋 Current indexes on chatrooms:');
    const chatroomIndexes = await db.collection('chatrooms').indexes();
    chatroomIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n📋 Current indexes on users:');
    const userIndexes = await db.collection('users').indexes();
    userIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n📋 Current indexes on messages:');
    const messageIndexes = await db.collection('messages').indexes();
    messageIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

addIndexes();
