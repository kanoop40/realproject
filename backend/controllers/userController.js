const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const generateToken = require('../utils/generateToken');
const fs = require('fs').promises;
const path = require('path');
const { deleteOldAvatar } = require('../config/cloudinary');

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
  const users = await User.find({})
    .populate('department', 'name')
    .populate('faculty', 'name')
    .populate('major', 'name')
    .populate('groupCode', 'name')
    .select('-password');
  res.json(users);
});
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    console.log(`🗑️ Starting cascade deletion for user: ${user.firstName} ${user.lastName} (${user._id})`);

    try {
        // Import required models
        const Messages = require('../models/MessagesModel');
        const GroupChat = require('../models/GroupChatModel');
        const Chatrooms = require('../models/ChatroomsModel');
        const File = require('../models/FileModel');
        const Notification = require('../models/NotificationModel');

        // 1. ลบข้อความทั้งหมดที่ user นั้นส่ง
        console.log('🗑️ Deleting all messages sent by user...');
        const deletedMessages = await Messages.deleteMany({ user_id: user._id });
        console.log(`✅ Deleted ${deletedMessages.deletedCount} messages`);

        // 2. ลบกลุ่มทั้งหมดที่ user นั้นสร้าง (creator)
        console.log('🗑️ Deleting groups created by user...');
        const groupsToDelete = await GroupChat.find({ creator: user._id });
        console.log(`📊 Found ${groupsToDelete.length} groups to delete`);
        
        for (const group of groupsToDelete) {
            console.log(`🗑️ Deleting group: ${group.groupName} (${group._id})`);
            
            // ลบรูปกลุ่มถ้ามี
            if (group.groupImage) {
                try {
                    const groupImagePath = path.join(__dirname, '..', 'uploads', group.groupImage);
                    await fs.unlink(groupImagePath);
                    console.log(`✅ Deleted group image: ${group.groupImage}`);
                } catch (imageError) {
                    console.log(`⚠️ Could not delete group image: ${imageError.message}`);
                }
            }
            
            if (group.groupAvatar) {
                try {
                    const groupAvatarPath = path.join(__dirname, '..', 'uploads', group.groupAvatar);
                    await fs.unlink(groupAvatarPath);
                    console.log(`✅ Deleted group avatar: ${group.groupAvatar}`);
                } catch (avatarError) {
                    console.log(`⚠️ Could not delete group avatar: ${avatarError.message}`);
                }
            }
            
            // ลบข้อความในกลุ่มนี้ด้วย
            await Messages.deleteMany({ group_id: group._id });
            // ลบกลุ่ม
            await GroupChat.deleteOne({ _id: group._id });
        }

        // 3. ลบ user ออกจากกลุ่มที่เป็นสมาชิก (แต่ไม่ใช่ creator)
        console.log('🗑️ Removing user from groups where they are members...');
        const updateResult = await GroupChat.updateMany(
            { 'members.user': user._id },
            { $pull: { members: { user: user._id } } }
        );
        console.log(`✅ Removed user from ${updateResult.modifiedCount} groups`);

        // 4. ลบ chatrooms ที่ user เป็นส่วนหนึ่ง
        console.log('🗑️ Deleting chatrooms where user is participant...');
        const chatroomsToDelete = await Chatrooms.find({
            $or: [
                { user_id: user._id },
                { participants: user._id },
                { 'members.userId': user._id }
            ]
        });
        console.log(`📊 Found ${chatroomsToDelete.length} chatrooms to process`);
        
        for (const chatroom of chatroomsToDelete) {
            // ลบข้อความในห้องแชทนี้
            await Messages.deleteMany({ chat_id: chatroom._id });
            // ลบห้องแชท
            await Chatrooms.deleteOne({ _id: chatroom._id });
        }

        // 5. ลบไฟล์ที่ user อัปโหลด
        console.log('🗑️ Deleting files uploaded by user...');
        const filesToDelete = await File.find({ uploadedBy: user._id });
        console.log(`📊 Found ${filesToDelete.length} files to delete`);
        
        // ลบไฟล์จากระบบไฟล์
        for (const file of filesToDelete) {
            try {
                if (file.file_path) {
                    const fullPath = path.join(__dirname, '..', file.file_path);
                    await fs.unlink(fullPath);
                    console.log(`✅ Deleted file from filesystem: ${file.file_name}`);
                }
            } catch (fileError) {
                console.log(`⚠️ Could not delete file ${file.file_name}: ${fileError.message}`);
            }
        }
        
        // ลบ records จากฐานข้อมูล
        const deletedFiles = await File.deleteMany({ uploadedBy: user._id });
        console.log(`✅ Deleted ${deletedFiles.deletedCount} file records from database`);

        // 5.1 ลบรูป avatar ของ user ถ้ามี
        if (user.avatar) {
            try {
                const avatarPath = path.join(__dirname, '..', 'uploads', user.avatar);
                await fs.unlink(avatarPath);
                console.log(`✅ Deleted user avatar: ${user.avatar}`);
            } catch (avatarError) {
                console.log(`⚠️ Could not delete user avatar: ${avatarError.message}`);
            }
        }

        // 6. ลบการแจ้งเตือนที่เกี่ยวข้องกับ user
        console.log('🗑️ Deleting notifications related to user...');
        const deletedNotifications = await Notification.deleteMany({
            $or: [
                { userId: user._id },
                { fromUserId: user._id }
            ]
        });
        console.log(`✅ Deleted ${deletedNotifications.deletedCount} notifications`);

        // 7. สุดท้าย ลบ user
        console.log('🗑️ Deleting user account...');
        await user.deleteOne();
        console.log('✅ User account deleted successfully');

        console.log('🎉 Cascade deletion completed successfully');
        res.json({ 
            message: 'User and all related data removed successfully',
            deletedData: {
                messages: deletedMessages.deletedCount,
                groups: groupsToDelete.length,
                groupMemberships: updateResult.modifiedCount,
                chatrooms: chatroomsToDelete.length,
                files: filesToDelete.length,
                fileRecords: deletedFiles.deletedCount,
                notifications: deletedNotifications.deletedCount,
                userAvatar: user.avatar ? 'deleted' : 'none'
            }
        });

    } catch (error) {
        console.error('❌ Error during cascade deletion:', error);
        res.status(500);
        throw new Error(`Failed to delete user and related data: ${error.message}`);
    }
});

// ฟังก์ชันสำหรับทำความสะอาดข้อมูลเก่าที่อาจเหลือค้างในระบบ
const cleanupOrphanedData = asyncHandler(async (req, res) => {
    console.log('🧹 Starting system cleanup for orphaned data...');
    
    try {
        const Messages = require('../models/MessagesModel');
        const GroupChat = require('../models/GroupChatModel');
        const Chatrooms = require('../models/ChatroomsModel');
        const File = require('../models/FileModel');
        const User = require('../models/UserModel');

        let cleanupResults = {
            orphanedMessages: 0,
            orphanedFiles: 0,
            emptyGroups: 0,
            emptyChatrooms: 0
        };

        // 1. ลบข้อความที่ user_id ไม่มีอยู่จริงในระบบ
        console.log('🧹 Cleaning orphaned messages...');
        const allUserIds = await User.find({}, { _id: 1 });
        const validUserIds = allUserIds.map(user => user._id);
        
        const orphanedMessages = await Messages.deleteMany({
            user_id: { $nin: validUserIds }
        });
        cleanupResults.orphanedMessages = orphanedMessages.deletedCount;
        console.log(`✅ Cleaned ${orphanedMessages.deletedCount} orphaned messages`);

        // 2. ลบไฟล์ที่ uploadedBy ไม่มีอยู่จริง
        console.log('🧹 Cleaning orphaned files...');
        const orphanedFiles = await File.deleteMany({
            uploadedBy: { $nin: validUserIds }
        });
        cleanupResults.orphanedFiles = orphanedFiles.deletedCount;
        console.log(`✅ Cleaned ${orphanedFiles.deletedCount} orphaned files`);

        // 3. ลบกลุ่มที่ไม่มีสมาชิกเหลือ
        console.log('🧹 Cleaning empty groups...');
        const emptyGroups = await GroupChat.deleteMany({
            $or: [
                { members: { $size: 0 } },
                { members: { $exists: false } }
            ]
        });
        cleanupResults.emptyGroups = emptyGroups.deletedCount;
        console.log(`✅ Cleaned ${emptyGroups.deletedCount} empty groups`);

        // 4. ลบ chatrooms ที่ไม่มี participants
        console.log('🧹 Cleaning empty chatrooms...');
        const emptyChatrooms = await Chatrooms.deleteMany({
            $and: [
                { $or: [{ participants: { $size: 0 } }, { participants: { $exists: false } }] },
                { $or: [{ user_id: { $size: 0 } }, { user_id: { $exists: false } }] }
            ]
        });
        cleanupResults.emptyChatrooms = emptyChatrooms.deletedCount;
        console.log(`✅ Cleaned ${emptyChatrooms.deletedCount} empty chatrooms`);

        console.log('🎉 System cleanup completed successfully');
        res.json({
            message: 'System cleanup completed successfully',
            cleanupResults
        });

    } catch (error) {
        console.error('❌ Error during system cleanup:', error);
        res.status(500);
        throw new Error(`System cleanup failed: ${error.message}`);
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
    const user = await User.findById(req.params.id)
        .populate('department', 'name')
        .populate('faculty', 'name')
        .populate('major', 'name')
        .populate('groupCode', 'name')
        .select('-password');
    
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            department: user.department,
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
            avatar: user.avatar,
            status: user.status,
            isOnline: user.isOnline,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin,
            lastSeen: user.lastSeen
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

        // ลบรูป avatar เก่าจาก Cloudinary ถ้ามี
        if (existingUser.avatar) {
            try {
                await deleteOldAvatar(existingUser.avatar);
                console.log('✅ Old avatar deleted from Cloudinary');
            } catch (deleteError) {
                console.error('❌ Error deleting old avatar from Cloudinary:', deleteError);
                // ไม่ให้ error นี้หยุดการอัพโหลดใหม่
            }
        }

        // ใช้ URL จาก Cloudinary ที่ส่งมาจาก multer
        const avatarUrl = req.file.path;
        console.log('📸 New avatar URL from Cloudinary:', avatarUrl);

        // อัพเดตข้อมูล avatar ในฐานข้อมูล
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar: avatarUrl },
            { 
                new: true,
                select: '-password'
            }
        );

        console.log('✅ Avatar updated successfully for user:', userId);

        res.json({
            message: 'อัพโหลดรูปโปรไฟล์สำเร็จ',
            avatar: avatarUrl,
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
        const { pushToken, deviceInfo } = req.body;

        console.log('🔔 Updating push token for user:', userId, 'Token:', pushToken ? 'SET' : 'REMOVE');
        if (deviceInfo) {
            console.log('📱 Device info:', deviceInfo);
        }

        // ถ้าเป็นการลบ token (logout)
        if (!pushToken) {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { pushToken: null },
                { new: true, select: '-password' }
            );
            
            console.log('🗑️ Push token removed for user:', userId);
            return res.json({
                message: 'ลบ Push Token สำเร็จ',
                pushToken: null
            });
        }

        // ถ้าเป็นการเซ็ต token ใหม่
        // ก่อนอื่น ลบ token นี้ออกจากผู้ใช้คนอื่น (ถ้ามี)
        const existingTokenUser = await User.findOne({ pushToken });
        if (existingTokenUser && existingTokenUser._id.toString() !== userId.toString()) {
            console.log(`⚠️ DUPLICATE TOKEN DETECTED! Removing token from previous user: ${existingTokenUser._id} (${existingTokenUser.firstName} ${existingTokenUser.lastName})`);
            await User.findByIdAndUpdate(existingTokenUser._id, { pushToken: null });
            console.log(`✅ Token removed from previous user: ${existingTokenUser._id}`);
        }

        // ตอนนี้เซ็ต token ให้ผู้ใช้ปัจจุบัน
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { pushToken },
            { new: true, select: '-password' }
        );

        if (!updatedUser) {
            res.status(404);
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }

        console.log(`✅ Push token set for user: ${userId} (${updatedUser.firstName} ${updatedUser.lastName})`);
        res.json({
            message: 'อัปเดต Push Token สำเร็จ',
            pushToken
        });
    } catch (error) {
        console.error('❌ Error updating push token:', error);
        throw error;
    }
});

// ดึงรายชื่อผู้ใช้สำหรับสร้างกลุ่ม (ไม่ต้อง admin permission)
const getUsersForGroupCreation = asyncHandler(async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const currentUserRole = req.user.role;
        
        console.log('Getting users for group creation, user role:', currentUserRole);

        // กำหนด role filter ตาม role ของผู้ใช้ปัจจุบัน
        let roleFilter = {};
        if (currentUserRole === 'student') {
            // นักศึกษาเลือกได้เฉพาะนักศึกษาและอาจารย์
            roleFilter = { role: { $in: ['student', 'อาจารย์', 'teacher'] } };
        } else if (currentUserRole === 'อาจารย์' || currentUserRole === 'teacher') {
            // อาจารย์เลือกได้ทุกคนยกเว้น admin
            roleFilter = { role: { $ne: 'admin' } };
        } else if (currentUserRole === 'admin') {
            // admin เลือกได้ทุกคนยกเว้นตัวเอง
            roleFilter = { role: { $ne: 'admin' } };
        }

        const users = await User.find({
            $and: [
                roleFilter,
                { _id: { $ne: currentUserId } }, // ไม่รวมตัวเอง
            ]
        }).select('firstName lastName avatar role classCode')
          .sort({ firstName: 1, lastName: 1 });

        console.log(`Found ${users.length} users for group creation`);
        res.json(users);
    } catch (error) {
        console.error('Error getting users for group creation:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

const getMajors = asyncHandler(async (req, res) => {
    try {
        // อนุญาตให้ทุก user เข้าถึงได้ (ไม่จำกัดแค่ teacher)
        // const currentUserRole = req.user.role;
        
        // if (currentUserRole !== 'อาจารย์' && currentUserRole !== 'teacher') {
        //     return res.status(403).json({ message: 'เฉพาะอาจารย์เท่านั้นที่สามารถเข้าถึงข้อมูลสาขาได้' });
        // }

        // หาสาขาที่มีอยู่และนับจำนวนรหัสกลุ่มเรียนในแต่ละสาขา
        const majors = await User.aggregate([
            {
                $match: {
                    major: { $exists: true, $ne: null, $ne: '', $ne: '1' },
                    role: { $ne: 'admin' }
                }
            },
            {
                $group: {
                    _id: '$major',
                    users: { $addToSet: '$_id' },
                    classCodes: { 
                        $addToSet: {
                            $cond: [
                                { $ne: ['$classCode', null] },
                                '$classCode',
                                '$groupCode'
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    major: '$_id',
                    userCount: { $size: '$users' },
                    classCodeCount: { 
                        $size: {
                            $filter: {
                                input: '$classCodes',
                                cond: { $and: [{ $ne: ['$$this', null] }, { $ne: ['$$this', ''] }, { $ne: ['$$this', '1'] }] }
                            }
                        }
                    },
                    _id: 0
                }
            },
            {
                $sort: { major: 1 }
            }
        ]);

        console.log(`Found ${majors.length} majors`);
        res.json(majors);
    } catch (error) {
        console.error('Error getting majors:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

const getClassCodesByMajor = asyncHandler(async (req, res) => {
    try {
        const { major } = req.params;
        // อนุญาตให้ทุกคนเข้าถึงได้ (ไม่จำกัดแค่ teacher)
        // const currentUserRole = req.user.role;
        
        // if (currentUserRole !== 'อาจารย์' && currentUserRole !== 'teacher') {
        //     return res.status(403).json({ message: 'เฉพาะอาจารย์เท่านั้นที่สามารถเข้าถึงข้อมูลกลุ่มเรียนได้' });
        // }

        // หา groupCode ที่มีอยู่ในสาขานั้น
        const classCodes = await User.aggregate([
            {
                $match: {
                    major: major,
                    groupCode: { $exists: true, $ne: null, $ne: '', $ne: '1' },
                    role: { $ne: 'admin' }
                }
            },
            {
                $group: {
                    _id: '$groupCode',
                    userCount: { $sum: 1 }
                }
            },
            {
                $match: {
                    _id: { $ne: null, $ne: '', $ne: '1' }
                }
            },
            {
                $project: {
                    classCode: '$_id',
                    userCount: 1,
                    _id: 0
                }
            },
            {
                $sort: { classCode: 1 }
            }
        ]);

        console.log(`Found ${classCodes.length} class codes for major: ${major}`);
        res.json(classCodes);
    } catch (error) {
        console.error('Error getting class codes by major:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ฟังก์ชันเดิม
const getClassCodes = asyncHandler(async (req, res) => {
    try {
        const currentUserRole = req.user.role;
        
        if (currentUserRole !== 'อาจารย์' && currentUserRole !== 'teacher') {
            return res.status(403).json({ message: 'เฉพาะอาจารย์เท่านั้นที่สามารถเข้าถึงข้อมูลกลุ่มเรียนได้' });
        }

        // หา classCode ที่มีอยู่และนับจำนวนผู้ใช้ในแต่ละ class
        const classCodes = await User.aggregate([
            {
                $match: {
                    $or: [
                        { classCode: { $exists: true, $ne: null, $ne: '' } },
                        { groupCode: { $exists: true, $ne: null, $ne: '' } }
                    ],
                    role: { $ne: 'admin' }
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $ne: ['$classCode', null] },
                            '$classCode',
                            '$groupCode'
                        ]
                    },
                    userCount: { $sum: 1 }
                }
            },
            {
                $match: {
                    _id: { $ne: null, $ne: '' }
                }
            },
            {
                $project: {
                    classCode: '$_id',
                    userCount: 1,
                    _id: 0
                }
            },
            {
                $sort: { classCode: 1 }
            }
        ]);

        console.log(`Found ${classCodes.length} class codes`);
        res.json(classCodes);
    } catch (error) {
        console.error('Error getting class codes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

const getUsersByClassCode = asyncHandler(async (req, res) => {
    try {
        const { classCode } = req.params;
        const currentUserId = req.user._id;
        const currentUserRole = req.user.role;
        
        if (currentUserRole !== 'อาจารย์' && currentUserRole !== 'teacher') {
            return res.status(403).json({ message: 'เฉพาะอาจารย์เท่านั้นที่สามารถดึงผู้ใช้ตามกลุ่มเรียนได้' });
        }

        const users = await User.find({
            groupCode: classCode,
            _id: { $ne: currentUserId }, // ไม่รวมตัวเอง
            role: { $ne: 'admin' } // ไม่รวม admin
        }).select('firstName lastName avatar role groupCode')
          .sort({ firstName: 1, lastName: 1 });

        console.log(`Found ${users.length} users in class ${classCode}`);
        res.json(users);
    } catch (error) {
        console.error('Error getting users by class code:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ฟังก์ชันเดิมที่มีอยู่แล้ว
const getUsersForGroupCreation_OLD = asyncHandler(async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const currentUserRole = req.user.role;
        
        console.log('Getting users for group creation. Current user role:', currentUserRole);

        // กำหนด role filter ตาม role ของผู้ใช้ปัจจุบัน
        let roleFilter = {};
        if (currentUserRole === 'student') {
            // นักศึกษาเห็นเฉพาะ student และ teacher เท่านั้น
            roleFilter = { role: { $in: ['student', 'teacher'] } };
        } else if (currentUserRole === 'teacher') {
            // teacher เห็นได้ทุก role ยกเว้น admin
            roleFilter = { role: { $ne: 'admin' } };
        } else if (currentUserRole === 'admin') {
            // admin เห็นได้ทุก role
            roleFilter = {};
        }

        const users = await User.find({
            $and: [
                roleFilter,
                { _id: { $ne: currentUserId } } // ไม่แสดงตัวเอง
            ]
        })
        .select('firstName lastName username role avatar')
        .sort({ firstName: 1, lastName: 1 })
        .limit(100); // จำกัดจำนวนไม่เกิน 100 คน

        console.log(`Found ${users.length} users for group creation`);

        res.json(users);
    } catch (error) {
        console.error('Error getting users for group creation:', error);
        res.status(500);
        throw new Error('ไม่สามารถดึงรายชื่อผู้ใช้ได้');
    }
});

// เปลี่ยนรหัสผ่าน
const changePassword = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400);
            throw new Error('กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่');
        }

        if (newPassword.length < 6) {
            res.status(400);
            throw new Error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        }

        // ค้นหาผู้ใช้และรวม password field
        const user = await User.findById(userId).select('+password');
        if (!user) {
            res.status(404);
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }

        // ตรวจสอบรหัสผ่านปัจจุบัน
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            res.status(400);
            throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        }

        // เข้ารหัสรหัสผ่านใหม่
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // อัปเดตรหัสผ่าน
        await User.findByIdAndUpdate(userId, { 
            password: hashedNewPassword 
        });

        console.log('✅ Password changed successfully for user:', userId);

        res.json({
            message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
});

module.exports = {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUserById,
    getCurrentUser,
    getUsers,
    deleteUser,
    cleanupOrphanedData,
    createUser,
    searchUsers,
    updateUser,
    updateProfile,
    uploadAvatar,
    changePassword,
    updatePushToken,
    getUsersForGroupCreation,
    getMajors,
    getClassCodes,
    getClassCodesByMajor,
    getUsersByClassCode
};