const mongoose = require('mongoose');
const User = require('../models/UserModel');
const Faculty = require('../models/FacultyModel');
const Department = require('../models/DepartmentModel');
const Major = require('../models/MajorModel');
require('dotenv').config();

const createPermanentAdmin = async () => {
    try {
        // เชื่อมต่อ MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔗 Connected to MongoDB');

        // ตรวจสอบว่ามี admin user1 อยู่แล้วหรือไม่
        const existingAdmin = await User.findOne({ username: 'user1' });
        if (existingAdmin) {
            console.log('✅ Admin user1 already exists');
            
            // อัปเดตข้อมูลถ้าจำเป็น
            existingAdmin.password = '123';
            existingAdmin.role = 'admin';
            existingAdmin.status = 'active';
            await existingAdmin.save();
            
            console.log('✅ Admin user1 updated successfully');
            return;
        }

        // หาหรือสร้าง Faculty, Department, Major สำหรับ admin
        let adminFaculty = await Faculty.findOne({ name: 'ระบบจัดการ' });
        if (!adminFaculty) {
            adminFaculty = await Faculty.create({
                name: 'ระบบจัดการ',
                code: 'SYS',
                description: 'คณะสำหรับผู้ดูแลระบบ'
            });
        }

        let adminDepartment = await Department.findOne({ name: 'ผู้ดูแลระบบ' });
        if (!adminDepartment) {
            adminDepartment = await Department.create({
                name: 'ผู้ดูแลระบบ',
                code: 'ADMIN',
                facultyId: adminFaculty._id,
                facultyName: adminFaculty.name
            });
        }

        let adminMajor = await Major.findOne({ name: 'ผู้ดูแลระบบ' });
        if (!adminMajor) {
            adminMajor = await Major.create({
                name: 'ผู้ดูแลระบบ',
                code: 'ADMIN',
                facultyId: adminFaculty._id,
                facultyName: adminFaculty.name,
                departmentId: adminDepartment._id,
                departmentName: adminDepartment.name
            });
        }

        // สร้าง admin user
        const adminUser = await User.create({
            username: 'user1',
            password: '123', // จะถูก hash อัตโนมัติใน pre-save middleware
            email: 'admin@chatapp.com',
            firstName: 'ผู้ดูแล',
            lastName: 'ระบบ',
            faculty: adminFaculty._id,
            department: adminDepartment._id,
            major: adminMajor._id,
            role: 'admin',
            status: 'active'
        });

        console.log('✅ Permanent admin user created successfully:');
        console.log(`   Username: ${adminUser.username}`);
        console.log(`   Password: 123`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);

    } catch (error) {
        console.error('❌ Error creating permanent admin:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
};

// รันทันทีถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
    createPermanentAdmin();
}

module.exports = createPermanentAdmin;