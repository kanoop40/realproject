const Notification = require('../models/Notification');
const User = require('../models/User');

const notificationController = {
  // ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
  getUserNotifications: async (req, res) => {
    try {
      const notifications = await Notification.find({
        user_id: req.user._id,
        isRead: false
      })
      .populate('chat_id', 'roomName')
      .populate('messages_id', 'content')
      .sort({ createdAt: -1 });

      res.json(notifications);
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน'
      });
    }
  },

  // มาร์คการแจ้งเตือนว่าอ่านแล้ว
  markAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true
      });

      res.json({ message: 'มาร์คว่าอ่านแล้ว' });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการอัพเดทการแจ้งเตือน'
      });
    }
  }
};

module.exports = notificationController;