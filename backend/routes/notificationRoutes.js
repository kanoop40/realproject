const express = require('express');
const router = express.Router();
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
    createNotification
} = require('../controllers/notificationController');
const { protect } = require('../Middleware/authMiddleware');

// ใช้ middleware protect สำหรับทุก route
router.use(protect);

// @route   GET /api/notifications
// @desc    ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
router.get('/', getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    ดึงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
router.get('/unread-count', getUnreadCount);

// @route   POST /api/notifications
// @desc    สร้างการแจ้งเตือนใหม่ (Admin only)
router.post('/', createNotification);

// @route   PUT /api/notifications/read-all
// @desc    ทำเครื่องหมายการแจ้งเตือนทั้งหมดว่าอ่านแล้ว
router.put('/read-all', markAllAsRead);

// @route   DELETE /api/notifications/all
// @desc    ลบการแจ้งเตือนทั้งหมด
router.delete('/all', deleteAllNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    ทำเครื่องหมายการแจ้งเตือนว่าอ่านแล้ว
router.put('/:id/read', markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    ลบการแจ้งเตือน
router.delete('/:id', deleteNotification);

module.exports = router;
