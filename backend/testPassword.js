const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/UserModel');
require('dotenv').config();

async function testPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // หา admin user
    const user = await User.findOne({ username: 'admin' });
    if (!user) {
      console.log('Admin user not found');
      return;
    }

    console.log('Admin user found');
    console.log('Stored password hash:', user.password);
    
    // ทดสอบ compare หลายแบบ
    console.log('Testing password comparisons:');
    
    const test1 = await bcrypt.compare('admin123', user.password);
    console.log('Compare admin123:', test1);
    
    const test2 = await bcrypt.compare('admin', user.password);
    console.log('Compare admin:', test2);
    
    // สร้าง hash ใหม่และทดสอบ
    const newHash = await bcrypt.hash('admin123', 10);
    console.log('New hash (salt 10):', newHash);
    
    const test3 = await bcrypt.compare('admin123', newHash);
    console.log('Compare with new hash:', test3);

  } catch (error) {
    console.error('Error testing password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testPassword();
