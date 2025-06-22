const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    primary: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: String,
  Messages: String,
  isRead: {
    type: Boolean,
    default: false
  },
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chatroom',
    required: true
  },
  messages_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  }
});

module.exports = mongoose.model('Notification', notificationSchema);