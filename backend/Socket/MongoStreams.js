const { Chat, Message } = require('../models/ChatModel');
const Notification = require('../models/NotificationModel');

module.exports = (io) => {
  // ติดตามการเปลี่ยนแปลงของข้อความ
  const messageStream = Message.watch();
  messageStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      const message = change.fullDocument;
      io.to(`chat:${message.chat}`).emit('new message', message);
    }
  });

  // ติดตามการเปลี่ยนแปลงของการแจ้งเตือน
  const notificationStream = Notification.watch();
  notificationStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      const notification = change.fullDocument;
      io.to(`user:${notification.recipient}`).emit('new notification', notification);
    }
  });
};