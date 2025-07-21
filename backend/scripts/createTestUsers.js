const mongoose = require('mongoose');
const User = require('../models/UserModel');

const createTestUsers = async () => {
    try {
        // เชื่อมต่อ MongoDB
        await mongoose.connect('mongodb+srv://punchkan2547:kanoop60@cluster0.pco8lhg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log('✅ Connected to MongoDB');

        // ข้อมูลผู้ใช้ทดสอบ
        const testUsers = [
            // นักศึกษา
            {
                username: 'student1',
                password: 'password123',
                email: 'student1@university.ac.th',
                firstName: 'สมชาย',
                lastName: 'ใจดี',
                faculty: 'วิศวกรรมศาสตร์',
                department: 'วิศวกรรมคอมพิวเตอร์',
                major: 'วิศวกรรมคอมพิวเตอร์',
                groupCode: 'CS01',
                studentId: '67130001',
                role: 'student'
            },
            {
                username: 'student2',
                password: 'password123',
                email: 'student2@university.ac.th',
                firstName: 'สมใส',
                lastName: 'รักเรียน',
                faculty: 'วิศวกรรมศาสตร์',
                department: 'วิศวกรรมคอมพิวเตอร์',
                major: 'วิศวกรรมคอมพิวเตอร์',
                groupCode: 'CS01',
                studentId: '67130002',
                role: 'student'
            },
            {
                username: 'student3',
                password: 'password123',
                email: 'student3@university.ac.th',
                firstName: 'สมศรี',
                lastName: 'ขยัน',
                faculty: 'ครุศาสตร์',
                department: 'เทคโนโลยีการศึกษา',
                major: 'เทคโนโลยีการศึกษา',
                groupCode: 'ED01',
                studentId: '67140001',
                role: 'student'
            },
            // อาจารย์
            {
                username: 'teacher1',
                password: 'password123',
                email: 'teacher1@university.ac.th',
                firstName: 'อ.ดร.สมพร',
                lastName: 'ใฝ่รู้',
                faculty: 'วิศวกรรมศาสตร์',
                department: 'วิศวกรรมคอมพิวเตอร์',
                employeeId: 'T001',
                role: 'teacher'
            },
            {
                username: 'teacher2',
                password: 'password123',
                email: 'teacher2@university.ac.th',
                firstName: 'อ.ดร.สมหวัง',
                lastName: 'มุ่งมั่น',
                faculty: 'ครุศาสตร์',
                department: 'เทคโนโลยีการศึกษา',
                employeeId: 'T002',
                role: 'teacher'
            },
            // เจ้าหน้าที่
            {
                username: 'staff1',
                password: 'password123',
                email: 'staff1@university.ac.th',
                firstName: 'สมหมาย',
                lastName: 'ซื่อสัตย์',
                faculty: 'สำนักงานอธิการบดี',
                department: 'งานทะเบียนและประมวลผล',
                employeeId: 'S001',
                role: 'staff'
            },
            {
                username: 'staff2',
                password: 'password123',
                email: 'staff2@university.ac.th',
                firstName: 'สมหญิง',
                lastName: 'อุตสาหะ',
                faculty: 'ศูนย์เทคโนโลยีสารสนเทศ',
                department: 'ศูนย์เทคโนโลยีสารสนเทศ',
                employeeId: 'S002',
                role: 'staff'
            }
        ];

        console.log('🔄 Creating test users...');

        for (const userData of testUsers) {
            try {
                // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
                const existingUser = await User.findOne({ 
                    $or: [
                        { username: userData.username },
                        { email: userData.email }
                    ]
                });

                if (existingUser) {
                    console.log(`⚠️  User ${userData.username} already exists, skipping...`);
                    continue;
                }

                const user = await User.create(userData);
                console.log(`✅ Created ${userData.role}: ${userData.username} (${userData.firstName} ${userData.lastName})`);
            } catch (error) {
                console.error(`❌ Error creating user ${userData.username}:`, error.message);
            }
        }

        console.log('🎉 Test users creation completed!');
        console.log('\n📝 Login credentials for testing:');
        console.log('================================');
        testUsers.forEach(user => {
            console.log(`${user.role.toUpperCase()}: ${user.username} / password123`);
        });

    } catch (error) {
        console.error('❌ Error in test users creation:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

createTestUsers();
