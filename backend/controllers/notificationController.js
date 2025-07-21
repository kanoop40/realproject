const asyncHandler = require('express-async-handler');
const Notification = require('../models/NotificationModel');

// @desc    ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    let query = { recipient: userId };
    
    if (unreadOnly === 'true') {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
        .populate('sender', 'firstName lastName username avatar role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false
    });

    res.json({
        success: true,
        data: notifications,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        },
        unreadCount
    });
});

// @desc    ทำเครื่องหมายการแจ้งเตือนว่าอ่านแล้ว
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
    });

    if (!notification) {
        res.status(404);
        throw new Error('ไม่พบการแจ้งเตือน');
    }

    await notification.markAsRead();

    res.json({
        success: true,
        message: 'ทำเครื่องหมายอ่านแล้วเรียบร้อย',
        data: notification
    });
});

// @desc    ทำเครื่องหมายการแจ้งเตือนทั้งหมดว่าอ่านแล้ว
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { 
            $set: { 
                isRead: true, 
                readAt: new Date() 
            } 
        }
    );

    res.json({
        success: true,
        message: 'ทำเครื่องหมายอ่านทั้งหมดเรียบร้อยแล้ว',
        modifiedCount: result.modifiedCount
    });
});

// @desc    ลบการแจ้งเตือน
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
    });

    if (!notification) {
        res.status(404);
        throw new Error('ไม่พบการแจ้งเตือน');
    }

    res.json({
        success: true,
        message: 'ลบการแจ้งเตือนเรียบร้อยแล้ว'
    });
});

// @desc    ลบการแจ้งเตือนทั้งหมด
// @route   DELETE /api/notifications/all
// @access  Private
const deleteAllNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const result = await Notification.deleteMany({
        recipient: userId
    });

    res.json({
        success: true,
        message: 'ลบการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว',
        deletedCount: result.deletedCount
    });
});

// @desc    ดึงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false
    });

    res.json({
        success: true,
        unreadCount
    });
});

// @desc    สร้างการแจ้งเตือนใหม่ (สำหรับระบบ)
// @route   POST /api/notifications
// @access  Private (Admin only)
const createNotification = asyncHandler(async (req, res) => {
    const { recipients, type, title, message, data } = req.body;
    const senderId = req.user._id;

    // ตรวจสอบสิทธิ์
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('ไม่มีสิทธิ์สร้างการแจ้งเตือน');
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400);
        throw new Error('กรุณาระบุผู้รับการแจ้งเตือน');
    }

    if (!type || !title || !message) {
        res.status(400);
        throw new Error('กรุณาระบุข้อมูลการแจ้งเตือนให้ครบถ้วน');
    }

    const notifications = [];

    for (const recipientId of recipients) {
        const notification = await Notification.createNotification({
            recipient: recipientId,
            sender: senderId,
            type,
            title,
            message,
            data: data || {}
        });

        notifications.push(notification);
    }

    res.status(201).json({
        success: true,
        message: 'สร้างการแจ้งเตือนเรียบร้อยแล้ว',
        data: notifications,
        count: notifications.length
    });
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
    createNotification
};
