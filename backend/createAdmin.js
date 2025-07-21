const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/UserModel');
require('dotenv').config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // ตรวจสอบว่ามี admin อยู่แล้วหรือไม่
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // สร้าง admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
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
    console.log('Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAdminUser();
