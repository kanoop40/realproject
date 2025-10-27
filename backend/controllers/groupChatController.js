const asyncHandler = require('express-async-handler');
const GroupChat = require('../models/GroupChatModel');
const User = require('../models/UserModel');
const Messages = require('../models/MessagesModel');
const Chatrooms = require('../models/ChatroomsModel');
const Notification = require('../models/NotificationModel');
const { deleteOldAvatar, cloudinary } = require('../config/cloudinary');

// @desc    สร้างกลุ่มใหม่
// @route   POST /api/groups
// @access  Private
const createGroup = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    let groupName, description, members;

    // ตรวจสอบว่าเป็น FormData หรือ JSON
    if (req.body.members && typeof req.body.members === 'string') {
        // FormData - parse JSON string
        try {
            members = JSON.parse(req.body.members);
            groupName = req.body.groupName;
            description = req.body.description;
        } catch (error) {
            res.status(400);
            throw new Error('ข้อมูลสมาชิกไม่ถูกต้อง');
        }
    } else {
        // Regular JSON
        ({ groupName, description, members } = req.body);
    }

    if (!groupName || groupName.trim() === '') {
        res.status(400);
        throw new Error('กรุณาใส่ชื่อกลุ่ม');
    }

    // จัดการรูปภาพกลุ่ม
    let groupAvatar = null;
    if (req.file) {
        groupAvatar = req.file.path; // ใช้ URL จาก Cloudinary โดยตรง
    }

    // ถ้ามี members ที่ส่งมา ให้ใช้แบบนั้น (สำหรับกลุ่มธรรมดา)
    let groupMembers;
    if (members && Array.isArray(members)) {
        // สร้างกลุ่มธรรมดาโดยผู้ใช้ทั่วไป
        groupMembers = members;
    } else {
        // ตรวจสอบสิทธิ์ (เฉพาะอาจารย์และเจ้าหน้าที่สามารถสร้างกลุ่มอัตโนมัติได้)
        if (!['teacher', 'staff', 'admin'].includes(req.user.role)) {
            res.status(403);
            throw new Error('ไม่มีสิทธิ์ในการสร้างกลุ่มอัตโนมัติ');
        }
        // สร้างกลุ่มอัตโนมัติ - เพิ่มเฉพาะผู้สร้าง
        groupMembers = [{
            user: userId,
            role: 'admin',
            joinedAt: new Date()
        }];
    }

    const group = await GroupChat.create({
        groupName: groupName.trim(),
        description: description || '',
        groupAvatar: groupAvatar, // เพิ่มรูปภาพกลุ่ม
        creator: userId,
        members: groupMembers,
        autoInviteSettings: req.body.autoInviteSettings || { enabled: false },
        settings: req.body.settings || {}
    });

    await group.populate('creator', 'firstName lastName username role avatar');
    await group.populate('members.user', 'firstName lastName username role avatar');

    // ถ้าเปิด Auto Invite ให้เชิญสมาชิกทันที
    const autoInviteSettings = req.body.autoInviteSettings || { enabled: false };
    if (autoInviteSettings && autoInviteSettings.enabled) {
        await processAutoInvite(group);
    }

    // ส่ง socket event ไปยังสมาชิกทั้งหมดในกลุ่ม
    const io = req.app.get('io');
    if (io) {
        console.log('📢 Emitting newGroup event for group:', group._id);
        
        // ส่งไปยังสมาชิกทั้งหมดในกลุ่ม
        group.members.forEach(member => {
            io.to(member.user._id.toString()).emit('newGroup', {
                group: group
            });
        });
        
        // ส่งไปยัง general chatListUpdate event สำหรับการอัปเดตรายการแชท
        group.members.forEach(member => {
            io.to(member.user._id.toString()).emit('chatListUpdate', {
                type: 'newGroup',
                group: group
            });
        });
    }

    res.status(201).json({
        success: true,
        data: group,
        message: 'สร้างกลุ่มสำเร็จ'
    });
});

// @desc    ดึงรายการกลุ่มของผู้ใช้
// @route   GET /api/groups
// @access  Private
const getUserGroups = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const groups = await GroupChat.find({
        'members.user': userId,
        isActive: true
    })
    .populate('creator', 'firstName lastName username role')
    .populate('members.user', 'firstName lastName username role avatar')
    .sort({ lastActivity: -1 });

    // เพิ่มการนับ unread count สำหรับแต่ละกลุ่ม
    const groupsWithUnreadCount = await Promise.all(
        groups.map(async (group) => {
            try {
                // หาข้อความที่ยังไม่อ่านในกลุ่มนี้
                const unreadCount = await Messages.countDocuments({
                    group_id: group._id, // ใช้ group_id แทน chatroomId
                    user_id: { $ne: userId }, // ใช้ user_id แทน sender (ไม่นับข้อความที่ส่งเอง)
                    readBy: { $not: { $elemMatch: { user: userId } } } // ยังไม่อ่าน
                });

                console.log(`📊 Group ${group.groupName} (${group._id}): unread count = ${unreadCount}`);

                return {
                    ...group.toObject(),
                    unreadCount: unreadCount || 0
                };
            } catch (error) {
                console.error('Error counting unread messages for group:', group._id, error);
                return {
                    ...group.toObject(),
                    unreadCount: 0
                };
            }
        })
    );

    res.json({
        success: true,
        data: groupsWithUnreadCount,
        count: groupsWithUnreadCount.length
    });
});

// @desc    ดึงข้อมูลกลุ่มเฉพาะ
// @route   GET /api/groups/:id
// @access  Private
const getGroupDetails = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
        .populate('creator', 'firstName lastName username role avatar')
        .populate('members.user', 'firstName lastName username role avatar');

    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    const isMember = group.members.some(member => 
        member.user._id.toString() === userId.toString()
    );

    if (!isMember) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงกลุ่มนี้');
    }

    res.json({
        success: true,
        data: {
            ...group.toObject(),
            admin: group.creator // เพิ่ม admin field เป็น alias สำหรับ creator
        }
    });
});

// @desc    ดึงสมาชิกกลุ่ม
// @route   GET /api/groups/:id/members
// @access  Private
const getGroupMembers = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
        .populate('members.user', 'firstName lastName username role avatar email');

    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    const isMember = group.members.some(member => 
        member.user._id.toString() === userId.toString()
    );

    if (!isMember) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงกลุ่มนี้');
    }

    // ส่งเฉพาะข้อมูลสมาชิก
    const members = group.members.map(member => ({
        _id: member.user._id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        username: member.user.username,
        role: member.user.role,
        avatar: member.user.avatar,
        email: member.user.email,
        memberRole: member.role,
        joinedAt: member.joinedAt
    }));

    res.json(members);
});

// @desc    เชิญสมาชิกเข้ากลุ่ม
// @route   POST /api/groups/:id/invite
// @access  Private
const inviteMembers = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const { userIds } = req.body;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบสิทธิ์ (แอดมินหรือผู้สร้าง)
    if (!group.isAdmin(userId)) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เชิญสมาชิก');
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400);
        throw new Error('กรุณาเลือกผู้ใช้ที่ต้องการเชิญ');
    }

    const users = await User.find({ _id: { $in: userIds } });
    const addedMembers = [];

    for (const user of users) {
        // ตรวจสอบว่าเป็นสมาชิกอยู่แล้วหรือไม่
        const isAlreadyMember = group.members.some(member => 
            member.user.toString() === user._id.toString()
        );

        if (!isAlreadyMember) {
            await group.addMember(user._id);
            addedMembers.push(user);

            // ส่งการแจ้งเตือน
            await Notification.createNotification({
                recipient: user._id,
                sender: userId,
                type: 'group_invite',
                title: 'คุณได้รับเชิญเข้ากลุ่ม',
                message: `${req.user.firstName} ${req.user.lastName} เชิญคุณเข้าร่วมกลุ่ม "${group.groupName}"`,
                group_id: groupId,
                data: { groupName: group.groupName }
            });
        }
    }

    await group.populate('members.user', 'firstName lastName username role avatar');

    res.json({
        success: true,
        data: group,
        message: `เชิญสมาชิก ${addedMembers.length} คนเข้ากลุ่มสำเร็จ`
    });
});

// @desc    ลบสมาชิกออกจากกลุ่ม
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
const removeMember = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบสิทธิ์
    const isAdmin = group.isAdmin(userId);
    const isSelf = userId.toString() === targetUserId;

    if (!isAdmin && !isSelf) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์ลบสมาชิก');
    }

    // ไม่สามารถลบผู้สร้างกลุ่มได้
    if (group.creator.toString() === targetUserId) {
        res.status(400);
        throw new Error('ไม่สามารถลบผู้สร้างกลุ่มได้');
    }

    await group.removeMember(targetUserId);

    // ส่งการแจ้งเตือน
    if (!isSelf) {
        await Notification.createNotification({
            recipient: targetUserId,
            sender: userId,
            type: 'group_leave',
            title: 'คุณถูกลบออกจากกลุ่ม',
            message: `คุณถูกลบออกจากกลุ่ม "${group.groupName}"`,
            group_id: groupId,
            data: { groupName: group.groupName }
        });
    }

    await group.populate('members.user', 'firstName lastName username role avatar');

    res.json({
        success: true,
        data: group,
        message: 'ลบสมาชิกสำเร็จ'
    });
});

// @desc    ออกจากกลุ่ม
// @route   POST /api/groups/:id/leave
// @access  Private
const leaveGroup = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    const isMember = group.members.some(member => 
        member.user.toString() === userId.toString()
    );

    if (!isMember) {
        res.status(403);
        throw new Error('คุณไม่ได้เป็นสมาชิกของกลุ่มนี้');
    }

    // ถ้าเป็นผู้สร้างกลุ่ม แนะนำให้ลบกลุ่มแทน
    if (group.creator.toString() === userId.toString()) {
        res.status(400);
        throw new Error('ผู้สร้างกลุ่มไม่สามารถออกจากกลุ่มได้ กรุณาลบกลุ่มแทน หรือโอนสิทธิ์ให้สมาชิกคนอื่นก่อน');
    }

    await group.removeMember(userId);

    res.json({
        success: true,
        message: 'ออกจากกลุ่มสำเร็จ'
    });
});

// @desc    ลบกลุ่ม
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;

    console.log('🗑️ Attempting to delete group:', groupId, 'by user:', userId);

    const group = await GroupChat.findById(groupId);
    
    if (!group) {
        console.log('❌ Group not found:', groupId);
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    console.log('🔍 Found group creator:', group.creator, 'Current user:', userId);
    console.log('🔍 Creator type:', typeof group.creator, 'User type:', typeof userId);
    console.log('🔍 Creator string:', group.creator.toString(), 'User string:', userId.toString());

    // เฉพาะผู้สร้างกลุ่มเท่านั้นที่ลบได้
    if (group.creator.toString() !== userId.toString()) {
        console.log('❌ User not authorized - Creator:', group.creator.toString(), 'User:', userId.toString());
        res.status(403);
        throw new Error('เฉพาะผู้สร้างกลุ่มเท่านั้นที่สามารถลบกลุ่มได้');
    }

    console.log('✅ User authorized to delete group');

    // ลบกลุ่มออกจากฐานข้อมูล (หรือตั้งเป็น inactive)
    group.isActive = false;
    await group.save();

    console.log(`🗑️ กลุ่ม "${group.groupName}" ถูกลบโดย ${req.user.firstName} ${req.user.lastName}`);

    // ส่งการแจ้งเตือนให้สมาชิกทั้งหมด (ยกเว้นผู้สร้าง)
    const memberIds = group.members
        .filter(member => member.user.toString() !== userId.toString())
        .map(member => member.user);

    for (const memberId of memberIds) {
        try {
            await Notification.createNotification({
                recipient: memberId,
                sender: userId,
                type: 'system',
                title: 'กลุ่มถูกลบ',
                message: `กลุ่ม "${group.groupName}" ได้ถูกลบโดยผู้สร้างกลุ่ม`,
                group_id: groupId,
                data: { groupName: group.groupName }
            });
        } catch (notifError) {
            console.error('Error sending delete notification:', notifError);
        }
    }

    res.json({
        success: true,
        message: `ลบกลุ่ม "${group.groupName}" สำเร็จ`
    });
});

// @desc    อัพเดทการตั้งค่า Auto Invite
// @route   PUT /api/groups/:id/auto-invite
// @access  Private
const updateAutoInviteSettings = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const { autoInviteSettings } = req.body;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบสิทธิ์ (แอดมินหรือผู้สร้าง)
    if (!group.isAdmin(userId)) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์แก้ไขการตั้งค่า');
    }

    group.autoInviteSettings = autoInviteSettings;
    await group.save();

    // ถ้าเปิด Auto Invite ให้ทำการเชิญสมาชิกใหม่
    if (autoInviteSettings.enabled) {
        await processAutoInvite(group);
    }

    res.json({
        success: true,
        data: group,
        message: 'อัพเดทการตั้งค่าสำเร็จ'
    });
});

// Helper function สำหรับ Auto Invite
const processAutoInvite = async (group) => {
    const { criteria } = group.autoInviteSettings;
    let query = { role: { $in: ['student', 'teacher', 'staff'] } };

    // สร้าง query ตามเงื่อนไข
    const conditions = [];

    if (criteria.byClass && criteria.byClass.enabled && criteria.byClass.groupCodes.length > 0) {
        conditions.push({ groupCode: { $in: criteria.byClass.groupCodes } });
    }

    if (criteria.byStudentId && criteria.byStudentId.enabled && criteria.byStudentId.pattern) {
        conditions.push({ studentId: { $regex: criteria.byStudentId.pattern } });
    }

    if (criteria.byFaculty && criteria.byFaculty.enabled && criteria.byFaculty.faculties.length > 0) {
        conditions.push({ faculty: { $in: criteria.byFaculty.faculties } });
    }

    if (criteria.byDepartment && criteria.byDepartment.enabled && criteria.byDepartment.departments.length > 0) {
        conditions.push({ department: { $in: criteria.byDepartment.departments } });
    }

    if (conditions.length > 0) {
        query.$or = conditions;
    }

    // หาผู้ใช้ที่ตรงเงื่อนไข
    const users = await User.find(query);
    
    // เชิญสมาชิกที่ยังไม่ได้เป็นสมาชิก
    for (const user of users) {
        const isAlreadyMember = group.members.some(member => 
            member.user.toString() === user._id.toString()
        );

        if (!isAlreadyMember && group.checkAutoInviteEligibility(user)) {
            await group.addMember(user._id);

            // ส่งการแจ้งเตือน
            await Notification.createNotification({
                recipient: user._id,
                sender: group.creator,
                type: 'group_join',
                title: 'คุณได้รับเชิญเข้ากลุ่มอัตโนมัติ',
                message: `คุณได้รับเชิญเข้าร่วมกลุ่ม "${group.groupName}" อัตโนมัติ`,
                group_id: group._id,
                data: { groupName: group.groupName }
            });
        }
    }
};

// @desc    ค้นหากลุ่ม
// @route   GET /api/groups/search
// @access  Private
const searchGroups = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.trim() === '') {
        res.status(400);
        throw new Error('กรุณาใส่คำค้นหา');
    }

    const groups = await GroupChat.find({
        $and: [
            { isActive: true },
            {
                $or: [
                    { groupName: { $regex: q.trim(), $options: 'i' } },
                    { description: { $regex: q.trim(), $options: 'i' } }
                ]
            }
        ]
    })
    .populate('creator', 'firstName lastName username role')
    .populate('members.user', 'firstName lastName username role avatar')
    .limit(20);

    res.json({
        success: true,
        data: groups,
        count: groups.length
    });
});

// @desc    ส่งข้อความในกลุ่ม
// @route   POST /api/groups/:id/messages
// @access  Private
const sendGroupMessage = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const { content, fileData, messageType } = req.body;
    const userId = req.user._id;
    
    // Handle files array from multer.any() (same as chat controller)
    let file = req.file;
    if (!file && req.files && req.files.length > 0) {
        // Find file field or use the first file
        file = req.files.find(f => f.fieldname === 'file') || req.files[0];
        console.log('🚀 Group using file from files array:', {
            fieldname: file.fieldname,
            originalname: file.originalname,
            size: file.size
        });
    }

    console.log('📨 Group message request received:', {
        groupId,
        content: content ? content.substring(0, 50) : 'No content',
        hasFile: !!file,
        hasFileData: !!fileData,
        messageType,
        contentType: req.get('Content-Type'),
        isMultipart: req.get('Content-Type')?.includes('multipart/form-data'),
        filesArrayLength: req.files?.length || 0,
        fileInfo: file ? {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path
        } : null
    });

    if (fileData) {
        console.log('🚀 Got fileData:', {
            name: fileData.name,
            type: fileData.type,
            base64Length: fileData.base64?.length
        });
    }

    // ตรวจสอบว่ามีไฟล์อัพโหลดหรือไม่
    const hasFile = file;
    const hasFileData = fileData;
    const hasContent = content && content.trim() !== '';

    if (!hasContent && !hasFile && !hasFileData) {
        res.status(400);
        throw new Error('กรุณาใส่ข้อความหรือไฟล์');
    }

    const group = await GroupChat.findById(groupId);
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    const isMember = group.members.some(member => 
        member.user.toString() === userId.toString()
    );

    if (!isMember) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์ส่งข้อความในกลุ่มนี้');
    }

    let messageData = {
        user_id: userId,
        chat_id: groupId,
        group_id: groupId,
        time: new Date()
    };

    // ถ้ามีไฟล์ (multipart upload)
    if (hasFile) {
        const isImage = file.mimetype && file.mimetype.startsWith('image/');
        
        console.log('📎 Group file upload info:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            cloudinaryPath: file.path,
            isImage: isImage
        });
        
        messageData.content = hasContent ? content.trim() : (isImage ? '📷 รูปภาพ' : '📎 ไฟล์');
        messageData.messageType = isImage ? 'image' : 'file';
        messageData.fileUrl = file.path; // Cloudinary URL
        messageData.fileName = file.originalname;
        messageData.fileSize = file.size;
        messageData.mimeType = file.mimetype;
        
        console.log('💾 Message data with file:', {
            messageType: messageData.messageType,
            fileUrl: messageData.fileUrl,
            fileName: messageData.fileName,
            fileSize: messageData.fileSize
        });
    } 
    // ถ้ามี base64 file data
    else if (hasFileData) {
        const isImage = fileData.type && fileData.type.startsWith('image/');
        
        console.log('🔥 Processing base64 file data for group:', {
            name: fileData.name,
            type: fileData.type,
            base64Length: fileData.base64?.length,
            isImage: isImage
        });
        
        try {
            console.log('📤 Starting file upload process...');
            console.log('📋 File data received:', {
                name: fileData.name,
                type: fileData.type,
                base64Length: fileData.base64 ? fileData.base64.length : 'undefined'
            });

            if (!fileData.base64) {
                throw new Error('ไม่พบข้อมูลไฟล์ base64');
            }

            const buffer = Buffer.from(fileData.base64, 'base64');
            console.log('📊 Buffer created, size:', buffer.length, 'bytes');
            
            // Check Cloudinary config
            if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                throw new Error('Cloudinary configuration missing');
            }
            
            // Upload to Cloudinary
            console.log('☁️ Uploading to Cloudinary...');
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'chat-app-files',
                        public_id: `group_${groupId}_${Date.now()}`,
                        access_mode: 'public', // ✅ ทำให้ไฟล์เข้าถึงได้โดยไม่ต้อง auth
                        type: 'upload'
                    },
                    (error, result) => {
                        if (error) {
                            console.error('☁️ Cloudinary error:', error);
                            reject(error);
                        } else {
                            console.log('☁️ Cloudinary success:', result.secure_url);
                            resolve(result);
                        }
                    }
                ).end(buffer);
            });
            
            console.log('✅ Cloudinary upload result:', result.secure_url);
            
            messageData.content = hasContent ? content.trim() : (isImage ? '📷 รูปภาพ' : '📎 ไฟล์');
            messageData.messageType = isImage ? 'image' : 'file';
            messageData.fileUrl = result.secure_url;
            messageData.fileName = fileData.name;
            messageData.fileSize = buffer.length;
            messageData.mimeType = fileData.type;
            
        } catch (error) {
            console.error('❌ Detailed upload error:', {
                message: error.message,
                stack: error.stack,
                cloudinaryConfig: {
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
                    api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
                    api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
                }
            });
            res.status(500);
            throw new Error(`ไม่สามารถอัพโหลดไฟล์ได้: ${error.message}`);
        }
    } 
    else {
        // ข้อความธรรมดา
        messageData.content = content.trim();
        messageData.messageType = 'text';
    }

    // สร้างข้อความใหม่
    const message = await Messages.create(messageData);
    await message.populate('user_id', 'firstName lastName username role avatar');

    console.log('📝 Created message:', {
        messageId: message._id,
        content: message.content,
        messageType: message.messageType,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        sender: {
            _id: message.user_id._id,
            firstName: message.user_id.firstName,
            lastName: message.user_id.lastName,
            avatar: message.user_id.avatar
        },
        time: message.time,
        now: new Date(),
        timeDiffSeconds: Math.abs((new Date() - new Date(message.time)) / 1000)
    });

    // อัปเดท lastActivity ของกลุ่ม
    group.lastActivity = new Date();
    await group.save();

    // ส่ง real-time message ไปยังสมาชิกทุกคน
    const io = req.app.get('io');
    if (io) {
        const socketMessage = {
            _id: message._id,
            content: message.content,
            sender: message.user_id, // ใช้ populated user_id เป็น sender
            timestamp: message.time,
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            fileSize: message.fileSize,
            mimeType: message.mimeType
        };

        io.to(groupId).emit('newMessage', {
            chatroomId: groupId,
            message: socketMessage
        });
        console.log('📤 Group message emitted to room:', groupId);
    }

    // แปลง response เพื่อให้ตรงกับที่ frontend คาดหวัง
    const responseMessage = {
        _id: message._id,
        content: message.content,
        sender: message.user_id, // ใช้ populated user_id เป็น sender
        timestamp: message.time,
        messageType: message.messageType,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType
    };

    res.status(201).json({
        success: true,
        data: responseMessage,
        message: 'ส่งข้อความสำเร็จ'
    });
});

// @desc    ดึงข้อความในกลุ่ม
// @route   GET /api/groups/:id/messages
// @access  Private
const getGroupMessages = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const group = await GroupChat.findById(groupId);
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    const isMember = group.members.some(member => 
        member.user.toString() === userId.toString()
    );

    if (!isMember) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงข้อความในกลุ่มนี้');
    }

    const messages = await Messages.find({ chat_id: groupId })
        .populate('user_id', 'firstName lastName username role avatar')
        .sort({ time: -1 }) // เรียงจากใหม่ไปเก่า สำหรับ pagination
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    // แปลง field names เพื่อให้ตรงกับที่ frontend คาดหวัง
    // และเรียงใหม่ให้เก่าไปใหม่สำหรับการแสดงผล
    const transformedMessages = messages.reverse().map(message => ({
        _id: message._id,
        content: message.content,
        sender: message.user_id, // แปลง user_id เป็น sender
        timestamp: message.time, // แปลง time เป็ timestamp
        messageType: message.messageType,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        readBy: message.readBy
    }));

    res.json({
        success: true,
        data: transformedMessages,
        count: transformedMessages.length
    });
});

// @desc    ลบข้อความในกลุ่ม
// @route   DELETE /api/groups/:id/messages/:messageId
// @access  Private
const deleteGroupMessage = asyncHandler(async (req, res) => {
    const { id: groupId, messageId } = req.params;
    const userId = req.user._id;

    // ตรวจสอบว่ากลุ่มมีอยู่
    const group = await GroupChat.findById(groupId);
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    const isMember = group.members.some(member => 
        member.user.toString() === userId.toString()
    );

    if (!isMember) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เข้าถึงกลุ่มนี้');
    }

    // หาข้อความ
    const message = await Messages.findById(messageId);
    if (!message) {
        res.status(404);
        throw new Error('ไม่พบข้อความ');
    }

    // ตรวจสอบสิทธิ์ในการลบ (เฉพาะเจ้าของข้อความหรือแอดมินกลุ่ม)
    const isOwner = message.user_id.toString() === userId.toString();
    const isGroupAdmin = group.isAdmin(userId);

    if (!isOwner && !isGroupAdmin) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์ลบข้อความนี้');
    }

    // ลบข้อความ
    await Messages.findByIdAndDelete(messageId);

    // ส่ง real-time update
    const io = req.app.get('io');
    if (io) {
        io.to(groupId).emit('messageDeleted', {
            messageId: messageId,
            chatroomId: groupId
        });
    }

    res.json({
        success: true,
        message: 'ลบข้อความสำเร็จ'
    });
});

// @desc    อัพเดทข้อมูลกลุ่ม (ชื่อ)
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const { groupName } = req.body;
    const userId = req.user._id;

    if (!groupName || groupName.trim() === '') {
        res.status(400);
        throw new Error('กรุณาใส่ชื่อกลุ่ม');
    }

    const group = await GroupChat.findById(groupId);
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็น admin ของกลุ่ม
    if (group.creator.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์แก้ไขกลุ่มนี้');
    }

    group.groupName = groupName.trim();
    await group.save();

    res.json({
        success: true,
        message: 'อัพเดทชื่อกลุ่มสำเร็จ',
        data: group
    });
});

// @desc    อัพเดทรูปกลุ่ม
// @route   PUT /api/groups/:id/avatar
// @access  Private
const updateGroupAvatar = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;

    if (!req.file) {
        res.status(400);
        throw new Error('กรุณาเลือกรูปภาพ');
    }

    const group = await GroupChat.findById(groupId);
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็น admin ของกลุ่ม
    if (group.creator.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์แก้ไขกลุ่มนี้');
    }

    // ลบรูปเก่า (ถ้ามี)
    if (group.groupAvatar) {
        try {
            await deleteOldAvatar(group.groupAvatar);
        } catch (error) {
            console.error('Error deleting old avatar:', error);
        }
    }

    group.groupAvatar = req.file.path;
    await group.save();

    res.json({
        success: true,
        message: 'อัพเดทรูปกลุ่มสำเร็จ',
        data: group,
        groupAvatar: group.groupAvatar
    });
});

// @desc    เพิ่มสมาชิกในกลุ่ม
// @route   POST /api/groups/:id/members
// @access  Private
const addMembers = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const { userIds } = req.body;
    const userId = req.user._id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400);
        throw new Error('กรุณาเลือกสมาชิกที่ต้องการเพิ่ม');
    }

    const group = await GroupChat.findById(groupId).populate('members.user', 'firstName lastName name email');
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // ตรวจสอบว่าเป็น admin ของกลุ่ม
    if (group.creator.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์เพิ่มสมาชิกในกลุ่มนี้');
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const usersToAdd = await User.find({ _id: { $in: userIds } });
    if (usersToAdd.length !== userIds.length) {
        res.status(400);
        throw new Error('ไม่พบผู้ใช้บางคน');
    }

    // เพิ่มสมาชิกใหม่ (ตรวจสอบไม่ให้ซ้ำ)
    const existingMemberIds = group.members.map(member => member.user.toString());
    const newMembers = userIds.filter(id => !existingMemberIds.includes(id));

    if (newMembers.length === 0) {
        res.status(400);
        throw new Error('ผู้ใช้ทั้งหมดอยู่ในกลุ่มแล้ว');
    }

    const membersToAdd = newMembers.map(userId => ({
        user: userId,
        role: 'member'
    }));

    group.members.push(...membersToAdd);
    await group.save();

    // Populate ข้อมูลสมาชิกใหม่
    await group.populate('members.user', 'firstName lastName name email avatar');

    // สร้างข้อความแจ้งเตือนสำหรับสมาชิกใหม่ที่เข้ากลุ่ม
    const addedUsers = usersToAdd.filter(user => newMembers.includes(user._id.toString()));
    const memberNames = addedUsers.map(user => `${user.firstName} ${user.lastName}`).join(', ');
    
    // สร้าง chatroom_id สำหรับ group (ใช้ group._id)
    let chatroom = await Chatrooms.findOne({ group_id: group._id });
    
    if (!chatroom) {
        // สร้าง chatroom ใหม่สำหรับ group ถ้ายังไม่มี
        chatroom = new Chatrooms({
            group_id: group._id,
            name: group.groupName,
            isGroup: true,
            members: group.members.map(m => m.user)
        });
        await chatroom.save();
    }
    
    // สร้างข้อความระบบแจ้งว่ามีสมาชิกใหม่เข้ามา
    const systemMessage = new Messages({
        chat_id: chatroom._id,
        group_id: group._id,
        user_id: req.user._id, // ใช้ผู้ที่เพิ่มสมาชิกเป็น sender
        content: `${memberNames} เข้าร่วมกลุ่ม`,
        messageType: 'system',
        time: new Date()
    });
    
    await systemMessage.save();
    
    // Populate ข้อมูล sender
    await systemMessage.populate('user_id', 'firstName lastName name email avatar');

    // ส่ง socket event ไปยังสมาชิกทั้งหมดในกลุ่ม
    const io = req.app.get('io');
    if (io) {
        console.log('📢 Emitting member_added system message to group:', group._id);
        
        // ส่งข้อความระบบผ่าน newMessage event
        io.to(group._id.toString()).emit('newMessage', {
            Messages_id: systemMessage._id,
            chat_id: systemMessage.chat_id,
            group_id: systemMessage.group_id,
            user_id: systemMessage.user_id,
            content: systemMessage.content,
            messageType: 'system',
            time: systemMessage.time,
            sender: systemMessage.user_id // เพื่อให้ frontend แสดงชื่อคนที่เพิ่มสมาชิก
        });
        
        // ส่ง event พิเศษสำหรับการเพิ่มสมาชิก (สำหรับ UI updates)
        io.to(group._id.toString()).emit('member_added', {
            groupId: group._id,
            newMembers: addedUsers,
            addedBy: req.user,
            message: `${memberNames} เข้าร่วมกลุ่ม`
        });
    }

    res.json({
        success: true,
        message: `เพิ่มสมาชิก ${newMembers.length} คนสำเร็จ`,
        data: group
    });
});

// @desc    แก้ไขข้อความในกลุ่ม
// @route   PUT /api/groups/:id/messages/:messageId
// @access  Private
const editGroupMessage = asyncHandler(async (req, res) => {
    try {
        const { id: groupId, messageId } = req.params;
        const { content } = req.body;
        const currentUserId = req.user._id;

        console.log('✏️ Edit group message request:', { groupId, messageId, content, currentUserId });

        // ตรวจสอบว่าข้อความใหม่ไม่ว่าง
        if (!content || content.trim() === '') {
            return res.status(400).json({
                message: 'กรุณาใส่เนื้อหาข้อความ'
            });
        }

        // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของกลุ่มหรือไม่
        const group = await GroupChat.findById(groupId);
        if (!group) {
            return res.status(404).json({
                message: 'ไม่พบกลุ่มที่ระบุ'
            });
        }

        const isMember = group.members.some(
            member => member.user.toString() === currentUserId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้'
            });
        }

        // หาข้อความที่ต้องการแก้ไข
        const message = await Messages.findById(messageId)
            .populate('user_id', 'firstName lastName avatar');

        if (!message) {
            return res.status(404).json({
                message: 'ไม่พบข้อความที่ต้องการแก้ไข'
            });
        }

        // ตรวจสอบว่าข้อความนี้อยู่ในกลุ่มที่ถูกต้องหรือไม่
        if (message.group_id.toString() !== groupId) {
            return res.status(400).json({
                message: 'ข้อความนี้ไม่ได้อยู่ในกลุ่มที่ระบุ'
            });
        }

        // ตรวจสอบว่าเป็นเจ้าของข้อความหรือไม่
        if (message.user_id._id.toString() !== currentUserId.toString()) {
            return res.status(403).json({
                message: 'คุณไม่สามารถแก้ไขข้อความของผู้อื่นได้'
            });
        }

        // ตรวจสอบว่าเป็นข้อความแบบ text เท่านั้น
        if (message.messageType !== 'text') {
            return res.status(400).json({
                message: 'สามารถแก้ไขได้เฉพาะข้อความข้อความเท่านั้น'
            });
        }

        // อัปเดตข้อความ
        message.content = content.trim();
        message.editedAt = new Date();
        await message.save();

        console.log('✅ Group message edited successfully:', messageId);

        // ส่งข้อมูลข้อความที่แก้ไขแล้วกลับไป
        const editedMessage = await Messages.findById(messageId)
            .populate('user_id', 'firstName lastName avatar');

        // ส่ง socket event เพื่อแจ้งสมาชิกอื่นในกลุ่มว่าข้อความถูกแก้ไข
        if (req.app.locals.io) {
            const socketData = {
                messageId: editedMessage._id,
                content: editedMessage.content,
                editedAt: editedMessage.editedAt,
                groupId: groupId
            };

            req.app.locals.io.to(groupId).emit('message_edited', socketData);
        }

        res.json({
            success: true,
            message: 'แก้ไขข้อความสำเร็จ',
            data: {
                _id: editedMessage._id,
                content: editedMessage.content,
                editedAt: editedMessage.editedAt,
                sender: editedMessage.user_id
            }
        });

    } catch (error) {
        console.error('❌ Error editing group message:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการแก้ไขข้อความ',
            error: error.message
        });
    }
});

// @desc    มาร์คข้อความในกลุ่มว่าอ่านแล้ว
// @route   PUT /api/groups/:id/read
// @access  Private
const markGroupMessagesAsRead = asyncHandler(async (req, res) => {
    const groupId = req.params.id;
    const userId = req.user._id;

    try {
        console.log(`📖 markGroupMessagesAsRead called for group: ${groupId} by user: ${userId}`);
        
        // ตรวจสอบว่าเป็นสมาชิกของกลุ่มหรือไม่
        const group = await GroupChat.findById(groupId);
        if (!group) {
            console.log('❌ Group not found:', groupId);
            res.status(404);
            throw new Error('ไม่พบกลุ่ม');
        }

        console.log(`📖 Found group: ${group.groupName} with ${group.members.length} members`);

        const isMember = group.members.some(member => 
            member.user.toString() === userId.toString()
        );

        if (!isMember) {
            res.status(403);
            throw new Error('ไม่มีสิทธิ์เข้าถึงกลุ่มนี้');
        }

        // อัปเดตข้อความทั้งหมดในกลุ่มที่ยังไม่อ่านให้เป็นอ่านแล้ว
        const result = await Messages.updateMany(
            {
                group_id: groupId, // ใช้ group_id แทน chatroomId
                user_id: { $ne: userId }, // ใช้ user_id แทน sender (ไม่รวมข้อความของตัวเอง)
                readBy: { $not: { $elemMatch: { user: userId } } } // ยังไม่อ่าน
            },
            {
                $push: {
                    readBy: {
                        user: userId,
                        readAt: new Date()
                    }
                }
            }
        );

        console.log(`📖 Group mark-as-read query:`, {
            group_id: groupId,
            user_id: { $ne: userId },
            readBy: { $not: { $elemMatch: { user: userId } } }
        });

        console.log(`📖 Marked ${result.modifiedCount} group messages as read for user ${userId} in group ${groupId}`);

        // ส่ง Socket event เพื่อแจ้ง update อื่นๆ
        if (req.app.locals.io && result.modifiedCount > 0) {
            req.app.locals.io.to(groupId).emit('messageRead', {
                chatroomId: groupId,
                userId: userId,
                readCount: result.modifiedCount
            });
        }

        res.json({
            success: true,
            message: 'มาร์คข้อความว่าอ่านแล้วเรียบร้อย',
            readCount: result.modifiedCount
        });

    } catch (error) {
        console.error('❌ Error marking group messages as read:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการมาร์คข้อความว่าอ่านแล้ว',
            error: error.message
        });
    }
});

// @desc    Check for new group messages (Real-time sync)
// @route   GET /api/groups/:id/check-new
// @access  Private
const checkNewGroupMessages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lastId } = req.query;
    const userId = req.user._id;
    
    console.log('checkNewGroupMessages called:', { groupId: id, lastId, userId });
    
    try {
        // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของกลุ่ม
        const group = await GroupChat.findById(id);
        if (!group) {
            console.log('Group not found:', id);
            return res.status(404).json({ message: 'ไม่พบกลุ่ม' });
        }
        
        const isMember = group.members.some(member => 
            member.user.toString() === userId.toString()
        );
        
        if (!isMember) {
            console.log('User not a member:', userId);
            return res.status(403).json({ message: 'คุณไม่ได้เป็นสมาชิกของกลุ่มนี้' });
        }
        
        let newMessages = [];
        
        if (lastId) {
            try {
                // หาข้อความใหม่ที่มี ID มากกว่า lastId
                const lastMessage = await Messages.findById(lastId);
                
                if (lastMessage) {
                    console.log('Last message found:', { id: lastMessage._id, time: lastMessage.time });
                    
                    // ค้นหาข้อความใหม่
                    const query = { 
                        group_id: id,
                        time: { $gt: lastMessage.time }
                    };
                    console.log('Query:', query);
                    
                    newMessages = await Messages.find(query)
                    .populate('user_id', 'firstName lastName username avatar')
                    .populate('file_id')
                    .sort({ time: 1 }) // เปลี่ยนเป็น ascending order
                    .limit(20);
                    
                    console.log('Found new messages:', newMessages.length);
                } else {
                    console.log('Last message not found for ID:', lastId);
                }
            } catch (queryError) {
                console.error('Query error:', queryError);
                // ถ้า query ล้มเหลว ให้ return empty array
                newMessages = [];
            }
        } else {
            console.log('No lastId provided');
        }
        
        // แปลงรูปแบบข้อความ (เพิ่ม null check)
        const formattedMessages = newMessages.map(message => {
            // ตรวจสอบว่า user_id ถูก populate หรือไม่
            if (!message.user_id) {
                console.warn('Message without user_id:', message._id);
                return {
                    _id: message._id,
                    content: message.content,
                    sender: {
                        _id: 'unknown',
                        username: 'Unknown User',
                        firstName: 'Unknown',
                        lastName: 'User',
                        avatar: null
                    },
                    timestamp: message.time,
                    type: message.file_id ? 'file' : 'text'
                };
            }
            
            return {
                _id: message._id,
                content: message.content,
                sender: {
                    _id: message.user_id._id,
                    username: message.user_id.username,
                    firstName: message.user_id.firstName,
                    lastName: message.user_id.lastName,
                    avatar: message.user_id.avatar
                },
                timestamp: message.time,
                type: message.file_id ? 'file' : 'text'
            };
        });
        
        res.json({
            hasNewMessages: newMessages.length > 0,
            newMessages: formattedMessages,
            count: newMessages.length
        });
        
    } catch (error) {
        console.error('Error checking new group messages:', {
            error: error.message,
            stack: error.stack,
            groupId: id,
            lastId: lastId,
            userId: userId
        });
        res.status(500).json({ message: 'ไม่สามารถตรวจสอบข้อความใหม่ได้' });
    }
});

// Group typing status storage (in-memory)
const groupTypingStatus = new Map();

// @desc    Set typing status for user in group
// @route   POST /api/groups/:id/typing
// @access  Private
const setGroupTypingStatus = asyncHandler(async (req, res) => {
    try {
        const groupId = req.params.id;
        const { isTyping } = req.body;
        const userId = req.user._id.toString();
        const username = req.user.firstName || req.user.username;

        console.log(`📝 Group Typing: User ${username} (${userId}) ${isTyping ? 'started' : 'stopped'} typing in group ${groupId}`);

        // ตรวจสอบว่าเป็นสมาชิกของกลุ่มหรือไม่
        const group = await GroupChat.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('ไม่พบกลุ่ม');
        }

        const isMember = group.members.some(member => 
            member.user.toString() === userId || member.user._id?.toString() === userId
        );
        if (!isMember) {
            res.status(403);
            throw new Error('คุณไม่ใช่สมาชิกของกลุ่มนี้');
        }

        const groupKey = `group_${groupId}`;
        
        if (!groupTypingStatus.has(groupKey)) {
            groupTypingStatus.set(groupKey, new Map());
        }
        
        const groupTyping = groupTypingStatus.get(groupKey);
        
        if (isTyping) {
            // เพิ่ม user ที่กำลังพิม พร้อม timestamp
            groupTyping.set(userId, {
                _id: userId,
                userId: userId,
                username: username,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                avatar: req.user.avatar,
                timestamp: Date.now()
            });
        } else {
            // ลบ user ที่หยุดพิม
            groupTyping.delete(userId);
        }

        // ลบ typing status ที่เก่าเกิน 4 วินาที
        const now = Date.now();
        for (const [uid, data] of groupTyping.entries()) {
            if (now - data.timestamp > 4000) {
                groupTyping.delete(uid);
            }
        }

        res.json({
            success: true,
            message: isTyping ? 'Group typing status set' : 'Group typing status removed'
        });

    } catch (error) {
        console.error('❌ Set group typing status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set group typing status'
        });
    }
});

// @desc    Get typing users in group
// @route   GET /api/groups/:id/typing
// @access  Private
const getGroupTypingUsers = asyncHandler(async (req, res) => {
    try {
        const groupId = req.params.id;
        const currentUserId = req.user._id.toString();
        
        // ตรวจสอบว่าเป็นสมาชิกของกลุ่มหรือไม่
        const group = await GroupChat.findById(groupId);
        if (!group) {
            res.status(404);
            throw new Error('ไม่พบกลุ่ม');
        }

        const isMember = group.members.some(member => 
            member.user.toString() === currentUserId || member.user._id?.toString() === currentUserId
        );
        if (!isMember) {
            res.status(403);
            throw new Error('คุณไม่ใช่สมาชิกของกลุ่มนี้');
        }

        const groupKey = `group_${groupId}`;
        const groupTyping = groupTypingStatus.get(groupKey) || new Map();
        
        // ลบ typing status ที่เก่าเกิน 4 วินาที
        const now = Date.now();
        for (const [uid, data] of groupTyping.entries()) {
            if (now - data.timestamp > 4000) {
                groupTyping.delete(uid);
            }
        }
        
        // ดึงรายชื่อผู้กำลังพิม (ยกเว้นตัวเอง)
        const typingMembers = Array.from(groupTyping.values())
            .filter(user => user.userId !== currentUserId)
            .map(user => ({
                _id: user._id,
                userId: user.userId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar
            }));

        console.log(`👀 Getting typing users for group ${groupId}: ${typingMembers.length} users typing`);

        res.json({
            success: true,
            typingMembers,
            count: typingMembers.length
        });

    } catch (error) {
        console.error('❌ Get group typing users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get group typing users'
        });
    }
});

module.exports = {
    createGroup,
    getUserGroups,
    getGroupDetails,
    getGroupMembers,
    updateGroup,
    updateGroupAvatar,
    addMembers,
    inviteMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    updateAutoInviteSettings,
    searchGroups,
    sendGroupMessage,
    getGroupMessages,
    deleteGroupMessage,
    editGroupMessage,
    markGroupMessagesAsRead,
    checkNewGroupMessages,
    setGroupTypingStatus,
    getGroupTypingUsers
};
