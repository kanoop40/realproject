const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { groupAvatarStorage } = require('../config/cloudinary');
const {
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
    getGroupMessages
} = require('../controllers/groupChatController');
const { protect } = require('../Middleware/authMiddleware');

// Multer configuration for group avatar uploads using Cloudinary
const upload = multer({ 
    storage: groupAvatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น'));
        }
    }
});

// ใช้ middleware protect สำหรับทุก route
router.use(protect);

// @route   GET /api/groups
// @desc    ดึงรายการกลุ่มของผู้ใช้
router.get('/', getUserGroups);

// @route   GET /api/groups/search
// @desc    ค้นหากลุ่ม
router.get('/search', searchGroups);

// @route   POST /api/groups
// @desc    สร้างกลุ่มใหม่
router.post('/', upload.single('groupAvatar'), createGroup);

// @route   GET /api/groups/:id
// @desc    ดึงข้อมูลกลุ่มเฉพาะ
router.get('/:id', getGroupDetails);

// @route   DELETE /api/groups/:id
// @desc    ลบกลุ่ม
router.delete('/:id', deleteGroup);

// @route   POST /api/groups/:id/invite
// @desc    เชิญสมาชิกเข้ากลุ่ม
router.post('/:id/invite', inviteMembers);

// @route   DELETE /api/groups/:id/members/:userId
// @desc    ลบสมาชิกออกจากกลุ่ม
router.delete('/:id/members/:userId', removeMember);

// @route   POST /api/groups/:id/leave
// @desc    ออกจากกลุ่ม
router.post('/:id/leave', leaveGroup);

// @route   PUT /api/groups/:id/auto-invite
// @desc    อัพเดทการตั้งค่า Auto Invite
router.put('/:id/auto-invite', updateAutoInviteSettings);

// @route   POST /api/groups/:id/messages
// @desc    ส่งข้อความในกลุ่ม
router.post('/:id/messages', sendGroupMessage);

// @route   GET /api/groups/:id/messages
// @desc    ดึงข้อความในกลุ่ม
router.get('/:id/messages', getGroupMessages);

module.exports = router;
