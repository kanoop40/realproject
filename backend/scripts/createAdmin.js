const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');

const createAdminUser = async () => {
    try {
        // เชื่อมต่อ MongoDB
        await mongoose.connect('mongodb+srv://punchkan2547:kanoop60@cluster0.pco8lhg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log('✅ Connected to MongoDB');

        // ตรวจสอบว่ามี admin อยู่แล้วหรือไม่
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('❌ Admin user already exists');
            console.log('Admin details:', {
                username: existingAdmin.username,
                email: existingAdmin.email,
                role: existingAdmin.role
            });
            process.exit(0);
        }

        // สร้าง admin user ใหม่
        const adminData = {
            username: 'admin',
            password: 'admin123', // ควรเปลี่ยนรหัสผ่านหลังสร้าง
            email: 'admin@university.ac.th',
            firstName: 'ผู้ดูแลระบบ',
            lastName: 'หลัก',
            faculty: 'ศูนย์เทคโนโลยีสารสนเทศ',
            department: 'ศูนย์เทคโนโลยีสารสนเทศ',
            employeeId: 'ADM001',
            role: 'admin',
            status: 'active'
        };

        const admin = await User.create(adminData);
        console.log('✅ Admin user created successfully!');
        console.log('Admin details:', {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            employeeId: admin.employeeId
        });
        console.log('📝 Please change the default password after first login');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

createAdminUser();
