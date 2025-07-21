const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/UserModel');
require('dotenv').config();

async function fixAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // สร้าง hash ใหม่ด้วย salt rounds 10
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('New hash:', hashedPassword);
    
    // อัปเดต password ของ admin user
    const result = await User.updateOne(
      { username: 'admin' },
      { password: hashedPassword }
    );
    
    console.log('Update result:', result);
    
    // ทดสอบ compare อีกครั้ง
    const user = await User.findOne({ username: 'admin' });
    const testCompare = await bcrypt.compare('admin123', user.password);
    console.log('Password compare test after update:', testCompare);

  } catch (error) {
    console.error('Error fixing admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixAdminPassword();
