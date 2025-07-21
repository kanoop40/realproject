const asyncHandler = require('express-async-handler');
const GroupChat = require('../models/GroupChatModel');
const User = require('../models/UserModel');
const Messages = require('../models/MessagesModel');
const Notification = require('../models/NotificationModel');

// @desc    สร้างกลุ่มใหม่
// @route   POST /api/groups
// @access  Private
const createGroup = asyncHandler(async (req, res) => {
    const { groupName, description, autoInviteSettings, settings } = req.body;
    const userId = req.user._id;

    // ตรวจสอบสิทธิ์ (เฉพาะอาจารย์และเจ้าหน้าที่สามารถสร้างกลุ่มได้)
    if (!['teacher', 'staff', 'admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์ในการสร้างกลุ่ม');
    }

    if (!groupName || groupName.trim() === '') {
        res.status(400);
        throw new Error('กรุณาใส่ชื่อกลุ่ม');
    }

    const group = await GroupChat.create({
        groupName: groupName.trim(),
        description: description || '',
        creator: userId,
        members: [{
            user: userId,
            role: 'admin',
            joinedAt: new Date()
        }],
        autoInviteSettings: autoInviteSettings || { enabled: false },
        settings: settings || {}
    });

    await group.populate('creator', 'firstName lastName username role');
    await group.populate('members.user', 'firstName lastName username role');

    // ถ้าเปิด Auto Invite ให้เชิญสมาชิกทันที
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

    // ไม่สามารถออกถ้าเป็นผู้สร้างกลุ่ม
    if (group.creator.toString() === userId.toString()) {
        res.status(400);
        throw new Error('ผู้สร้างกลุ่มไม่สามารถออกจากกลุ่มได้ หากต้องการให้ลบกลุ่ม');
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

    const group = await GroupChat.findById(groupId);
    
    if (!group) {
        res.status(404);
        throw new Error('ไม่พบกลุ่ม');
    }

    // เฉพาะผู้สร้างกลุ่มเท่านั้นที่ลบได้
    if (group.creator.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('เฉพาะผู้สร้างกลุ่มเท่านั้นที่สามารถลบกลุ่มได้');
    }

    // อัพเดทสถานะเป็น inactive แทนการลบ
    group.isActive = false;
    await group.save();

    // ส่งการแจ้งเตือนให้สมาชิกทั้งหมด
    const memberIds = group.members
        .filter(member => member.user.toString() !== userId.toString())
        .map(member => member.user);

    for (const memberId of memberIds) {
        await Notification.createNotification({
            recipient: memberId,
            sender: userId,
            type: 'system',
            title: 'กลุ่มถูกลบ',
            message: `กลุ่ม "${group.groupName}" ได้ถูกลบโดยผู้สร้างกลุ่ม`,
            group_id: groupId,
            data: { groupName: group.groupName }
        });
    }

    res.json({
        success: true,
        message: 'ลบกลุ่มสำเร็จ'
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

module.exports = {
    createGroup,
    getUserGroups,
    getGroupDetails,
    inviteMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    updateAutoInviteSettings,
    searchGroups
};
