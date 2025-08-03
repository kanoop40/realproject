const asyncHandler = require('express-async-handler');
const GroupChat = require('../models/GroupChatModel');
const User = require('../models/UserModel');
const Messages = require('../models/MessagesModel');
const Notification = require('../models/NotificationModel');
const { deleteOldAvatar } = require('../config/cloudinary');

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

    res.json({
        success: true,
        data: groups,
        count: groups.length
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
        data: group
    });
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
    const { content } = req.body;
    const userId = req.user._id;

    console.log('📨 Group message request received:', {
        groupId,
        content: content ? content.substring(0, 50) : 'No content',
        hasFile: !!req.file,
        fileInfo: req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        } : null
    });

    // ตรวจสอบว่ามีไฟล์อัพโหลดหรือไม่
    const hasFile = req.file;
    const hasContent = content && content.trim() !== '';

    if (!hasContent && !hasFile) {
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

    // ถ้ามีไฟล์
    if (hasFile) {
        const isImage = req.file.mimetype && req.file.mimetype.startsWith('image/');
        
        messageData.content = hasContent ? content.trim() : (isImage ? '📷 รูปภาพ' : '📎 ไฟล์');
        messageData.messageType = isImage ? 'image' : 'file';
        messageData.fileUrl = req.file.path; // Cloudinary URL
        messageData.fileName = req.file.originalname;
        messageData.fileSize = req.file.size;
        messageData.mimeType = req.file.mimetype;
    } else {
        // ข้อความธรรมดา
        messageData.content = content.trim();
        messageData.messageType = 'text';
    }

    // สร้างข้อความใหม่
    const message = await Messages.create(messageData);
    await message.populate('user_id', 'firstName lastName username role avatar');

    console.log('📝 Created message with sender info:', {
        messageId: message._id,
        content: message.content,
        messageType: message.messageType,
        sender: {
            _id: message.user_id._id,
            firstName: message.user_id.firstName,
            lastName: message.user_id.lastName,
            avatar: message.user_id.avatar
        }
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
        .sort({ time: 1 }) // เรียงจากเก่าไปใหม่
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    // แปลง field names เพื่อให้ตรงกับที่ frontend คาดหวัง
    const transformedMessages = messages.map(message => ({
        _id: message._id,
        content: message.content,
        sender: message.user_id, // แปลง user_id เป็น sender
        timestamp: message.time, // แปลง time เป็น timestamp
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

module.exports = {
    createGroup,
    getUserGroups,
    getGroupDetails,
    inviteMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    updateAutoInviteSettings,
    searchGroups,
    sendGroupMessage,
    getGroupMessages,
    deleteGroupMessage
};
