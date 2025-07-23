const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const generateToken = require('../utils/generateToken');

const searchUsers = asyncHandler(async (req, res) => {
    try {
        const q = req.query.q ? req.query.q.trim() : '';
        const currentUserId = req.user._id;
        const currentUserRole = req.user.role; // ได้จาก auth middleware
        console.log('Search query:', q);
        console.log('Current user role:', currentUserRole);

        // ถ้าไม่มีคำค้นหา ส่งarray ว่างกลับไป
        if (!q) {
            console.log('Empty search query, returning empty array');
            return res.json([]);
        }

        // สร้าง regex สำหรับค้นหาแบบ case-insensitive
        const searchRegex = new RegExp(q, 'i');
        console.log('Search regex:', searchRegex);

        // กำหนด role filter ตาม role ของผู้ใช้ปัจจุบัน
        let roleFilter = {};
        if (currentUserRole === 'student') {
            // นักศึกษาค้นหาเจอทุกคนยกเว้น admin
            roleFilter = { role: { $ne: 'admin' } };
        } else if (currentUserRole === 'teacher') {
            // teacher ค้นหาได้ทุก role ยกเว้น admin
            roleFilter = { role: { $ne: 'admin' } };
        } else if (currentUserRole === 'admin') {
            // admin ค้นหาได้ทุก role
            roleFilter = {};
        }

        // ค้นหาเฉพาะชื่อและนามสกุล พร้อมกรอง role
        const query = {
            $and: [
                roleFilter, // กรอง role
                { _id: { $ne: currentUserId } }, // ไม่แสดงตัวเอง
                {
                    $or: [
                        { firstName: searchRegex },
                        { lastName: searchRegex },
                        { 
                            $expr: {
                                $regexMatch: {
                                    input: { $concat: ['$firstName', ' ', '$lastName'] },
                                    regex: q,
                                    options: 'i'
                                }
                            }
                        }
                    ]
                }
            ]
        };

        console.log('MongoDB query:', JSON.stringify(query, null, 2)); // Debug log

        const users = await User.find(query)
            .select('-password')
            .sort({ firstName: 1, lastName: 1 }); // เรียงตามชื่อ

        console.log(`Found ${users.length} users`); // Debug log

        // ส่งผลลัพธ์กลับไป
        res.json(users.map(user => ({
            _id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            faculty: user.faculty,
            major: user.major,
            groupCode: user.groupCode,
            role: user.role,
            avatar: user.avatar
        })));

    } catch (error) {
        console.error('Search error:', error); // Debug log
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการค้นหา',
            error: error.message
        });
    }
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (user) {
        await user.deleteOne();  // เปลี่ยนจาก remove() เป็น deleteOne()
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.faculty = req.body.faculty || user.faculty;
        user.major = req.body.major || user.major;
        user.groupCode = req.body.groupCode || user.groupCode;
        user.role = req.body.role || user.role;
        
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            faculty: updatedUser.faculty,
            major: updatedUser.major,
            groupCode: updatedUser.groupCode,
            role: updatedUser.role
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


const authUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    // ค้นหาผู้ใช้
    const user = await User.findOne({
        $or: [
            { email: email?.toLowerCase() },
            { username: username?.toLowerCase() }
        ]
    });
    
    console.log('Login attempt for:', email || username);
    console.log('Found user:', user);

    if (user && (await user.matchPassword(password))) {
        const token = generateToken(user._id);
        console.log('Generated token:', token); // เพิ่ม log
        
        // ทดสอบ verify token ทันที
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token verified after generation:', decoded);
        } catch (error) {
            console.error('Token verification failed:', error);
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName, faculty, major, groupCode, role } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
    const userExists = await User.findOne({ 
        $or: [
            { email: email.toLowerCase() }, 
            { username: username.toLowerCase() }
        ] 
    });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // ตรวจสอบว่า role ถูกต้องหรือไม่
    const validRoles = ['admin', 'teacher', 'student'];
    if (role && !validRoles.includes(role)) {
        res.status(400);
        throw new Error(`Invalid role. Role must be one of: ${validRoles.join(', ')}`);
    }

    // สร้างผู้ใช้ใหม่
    const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        faculty,
        major,
        groupCode,
        role: role || 'student' // ถ้าไม่ระบุ role จะเป็น student
    });

    if (user) {
        console.log('Created user:', {
            id: user._id,
            username: user.username,
            role: user.role,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: generateToken(user._id)
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            faculty: user.faculty,
            major: user.major,
            groupCode: user.groupCode,
            role: user.role
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.faculty = req.body.faculty || user.faculty;
        user.major = req.body.major || user.major;
        user.groupCode = req.body.groupCode || user.groupCode;
        
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            faculty: updatedUser.faculty,
            major: updatedUser.major,
            groupCode: updatedUser.groupCode,
            role: updatedUser.role,
            token: generateToken(updatedUser._id)
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const createUser = asyncHandler(async (req, res) => {
  try {
    let {
      username,
      password,
      firstName,
      lastName,
      email,
      role,
      faculty,
      department,
      major,
      groupCode
    } = req.body;

    console.log('Creating user with data:', { username, email, role, faculty, major, groupCode });

    // ทำความสะอาด email - ถ้าเป็นค่าว่างให้เป็น undefined
    if (email === '' || email === null || (typeof email === 'string' && email.trim() === '')) {
      email = undefined;
    } else if (email) {
      email = email.trim();
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400);
      throw new Error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }

    // ตรวจสอบว่า email ซ้ำหรือไม่ (เฉพาะเมื่อมี email)
    if (email) {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        res.status(400);
        throw new Error('อีเมลนี้มีอยู่ในระบบแล้ว');
      }
    }

    // เตรียมข้อมูลสำหรับสร้างผู้ใช้
    const userData = {
      username,
      password,
      firstName,
      lastName,
      role,
      faculty,
      department,
      major,
      groupCode
    };

    // เพิ่มอีเมลเฉพาะเมื่อมีการกรอกมา (ไม่เป็นค่าว่าง)
    if (email) {
      userData.email = email;
    }

    const user = await User.create(userData);

    if (user) {
      console.log('User created successfully:', user.username);
      res.status(201).json({
        message: 'สร้างผู้ใช้สำเร็จ',
        userId: user._id
      });
    } else {
      res.status(400);
      throw new Error('ข้อมูลผู้ใช้ไม่ถูกต้อง');
    }
  } catch (error) {
    console.error('Error in createUser:', error.message);
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'username' ? 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' : 
                      field === 'email' ? 'อีเมลนี้มีอยู่ในระบบแล้ว' : 
                      'ข้อมูลซ้ำในระบบ';
      res.status(400);
      throw new Error(message);
    }
    throw error;
  }
});
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            faculty: user.faculty,
            major: user.major,
            groupCode: user.groupCode,
            role: user.role,
            avatar: user.avatar,
            status: user.status,
            isOnline: user.isOnline,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin,
            // สถิติการใช้งาน (ให้ค่าเริ่มต้นถ้าไม่มี)
            messageCount: user.messageCount || 0,
            chatRoomsCount: user.chatRoomsCount || 0,
            fileUploadsCount: user.fileUploadsCount || 0
        });
    } else {
        res.status(404);
        throw new Error('ไม่พบข้อมูลผู้ใช้');
    }
});

// @desc    Get current user info
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            faculty: user.faculty,
            major: user.major,
            groupCode: user.groupCode,
            role: user.role,
            avatar: user.avatar
        });
    } else {
        res.status(404);
        throw new Error('ไม่พบข้อมูลผู้ใช้');
    }
});

// อัพเดตโปรไฟล์ผู้ใช้
const updateProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { firstName, lastName, email, faculty, major, groupCode } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!firstName || !lastName || !email) {
            res.status(400);
            throw new Error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        }

        // ตรวจสอบว่าอีเมลซ้ำกับผู้ใช้คนอื่นหรือไม่
        const existingUser = await User.findOne({ 
            email: email, 
            _id: { $ne: userId } 
        });

        if (existingUser) {
            res.status(400);
            throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
        }

        // อัพเดตข้อมูลผู้ใช้
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                email,
                faculty,
                major,
                groupCode
            },
            { 
                new: true,
                select: '-password'
            }
        );

        if (!updatedUser) {
            res.status(404);
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.code === 11000) {
            res.status(400);
            throw new Error('อีเมลนี้ถูกใช้งานแล้ว');
        }
        throw error;
    }
});

// อัพโหลดรูปโปรไฟล์
const uploadAvatar = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.file) {
            res.status(400);
            throw new Error('กรุณาเลือกไฟล์รูปภาพ');
        }

        // ค้นหาข้อมูลผู้ใช้เดิมเพื่อดู avatar เก่า
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            res.status(404);
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }

        // ลบรูป avatar เก่าถ้ามี
        if (existingUser.avatar) {
            const fs = require('fs');
            const path = require('path');
            
            try {
                // แปลง avatar path ให้เป็น full path
                const oldAvatarPath = path.join(__dirname, '..', existingUser.avatar);
                console.log('🗑️ Attempting to delete old avatar:', oldAvatarPath);
                
                // ตรวจสอบว่าไฟล์มีอยู่จริงก่อนลบ
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                    console.log('✅ Old avatar deleted successfully');
                } else {
                    console.log('⚠️ Old avatar file not found');
                }
            } catch (deleteError) {
                console.error('❌ Error deleting old avatar:', deleteError);
                // ไม่ให้ error นี้หยุดการอัพโหลดใหม่
            }
        }

        // แปลง path ให้เป็น forward slash สำหรับ URL
        const avatarPath = req.file.path.replace(/\\/g, '/');
        console.log('📸 New avatar path:', avatarPath);

        // อัพเดตข้อมูล avatar ในฐานข้อมูล
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar: avatarPath },
            { 
                new: true,
                select: '-password'
            }
        );

        console.log('✅ Avatar updated successfully for user:', userId);

        res.json({
            message: 'อัพโหลดรูปโปรไฟล์สำเร็จ',
            avatar: avatarPath,
            user: {
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                username: updatedUser.username,
                avatar: updatedUser.avatar
            }
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
});

// อัปเดต Push Token
const updatePushToken = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { pushToken } = req.body;

        console.log('Updating push token for user:', userId, 'Token:', pushToken);

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { pushToken },
            { new: true, select: '-password' }
        );

        if (!updatedUser) {
            res.status(404);
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }

        res.json({
            message: 'อัปเดต Push Token สำเร็จ',
            pushToken
        });
    } catch (error) {
        console.error('Error updating push token:', error);
        throw error;
    }
});

module.exports = {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUserById,
    getCurrentUser,    // เพิ่ม getCurrentUser
    getUsers,         // เพิ่ม getUsers
    deleteUser,
    createUser,
    searchUsers,
    updateUser,        // เพิ่ม deleteUser
    updateProfile,     // เพิ่ม updateProfile
    uploadAvatar,      // เพิ่ม uploadAvatar
    updatePushToken    // เพิ่ม updatePushToken
};