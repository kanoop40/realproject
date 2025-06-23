const asyncHandler = require('express-async-handler');
const Notification = require('../models/NotificationModel');

// สร้างการแจ้งเตือน
const createNotification = asyncHandler(async (req, res) => {
  const { recipientId, type, chatId, message } = req.body;

  const notification = await Notification.create({
    recipient: recipientId,
    sender: req.user._id,
    type,
    chatId,
    message
  });

  // ส่งการแจ้งเตือนผ่าน Socket.IO
  req.io.to(recipientId).emit('new notification', notification);

  res.status(201).json(notification);
});

// ดึงการแจ้งเตือนที่ยังไม่ได้อ่าน
const getUnreadNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    recipient: req.user._id,
    read: false
  })
    .populate('sender', 'username firstName lastName')
    .sort('-createdAt');

  res.json(notifications);
});

// อ่านการแจ้งเตือน
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  notification.read = true;
  await notification.save();

  res.json(notification);
});

module.exports = { 
  createNotification, 
  getUnreadNotifications, 
  markAsRead 
};