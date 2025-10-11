require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/UserModel');

// เชื่อมต่อฐานข้อมูล
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

// ฟังก์ชันทำความสะอาดข้อมูล email ที่เป็นค่าว่าง
const cleanEmptyEmails = async () => {
  try {
    // หาผู้ใช้ที่มี email เป็นค่าว่าง
    const usersWithEmptyEmail = await User.find({
      $or: [
        { email: '' },
        { email: null },
        { email: { $exists: false } }
      ]
    });

    console.log(`Found ${usersWithEmptyEmail.length} users with empty emails`);

    // อัปเดตให้ไม่มี email field
    const result = await User.updateMany(
      {
        $or: [
          { email: '' },
          { email: null }
        ]
      },
      {
        $unset: { email: 1 }
      }
    );

    console.log(`Updated ${result.modifiedCount} users - removed empty email fields`);

    // แสดงผู้ใช้ที่เหลือ
    const remainingUsers = await User.find({}).select('username email role');
    console.log('Remaining users:');
    remainingUsers.forEach(user => {
      console.log(`- ${user.username} (${user.role}): ${user.email || 'no email'}`);
    });

  } catch (error) {
    console.error('Error cleaning empty emails:', error);
  } finally {
    mongoose.connection.close();
  }
};

// รันสคริปต์
const runCleanup = async () => {
  await connectDB();
  await cleanEmptyEmails();
};

runCleanup();
