const express = require('express');
const router = express.Router();
const {
    createGroup,
    getUserGroups,
    getGroupDetails,
    inviteMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    updateAutoInviteSettings,
    searchGroups
} = require('../controllers/groupChatController');
const { protect } = require('../Middleware/authMiddleware');

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
router.post('/', createGroup);

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

module.exports = router;
