const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/UserModel');
require('dotenv').config();

async function resetAdminUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // ลบ admin user เก่า
    await User.deleteOne({ username: 'admin' });
    console.log('Deleted existing admin user');

    // สร้าง admin user ใหม่
    const hashedPassword = await bcrypt.hash('admin123', 12);
    console.log('Generated hash for admin123:', hashedPassword);
    
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'admin@chatapp.com',
      password: hashedPassword,
      faculty: 'IT',
      major: 'Computer Science',
      groupCode: 'ADMIN001',
      role: 'admin',
      status: 'active'
    });

    await adminUser.save();
    console.log('New admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');

    // ทดสอบ password compare
    const testCompare = await bcrypt.compare('admin123', hashedPassword);
    console.log('Password compare test:', testCompare);

  } catch (error) {
    console.error('Error resetting admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetAdminUser();
