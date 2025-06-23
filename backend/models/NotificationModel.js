const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    Notification_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      auto: true,
      primary: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: true
    },
    Messages: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    chat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chatroom',
      required: true
    },
    Messages_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true
    }
  }
);