const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [messageSchema],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  chatType: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index สำหรับการค้นหาแชทของผู้ใช้
chatSchema.index({ participants: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Method สำหรับหาแชทระหว่างผู้ใช้ 2 คน
chatSchema.statics.findPrivateChat = function(userId1, userId2) {
  return this.findOne({
    chatType: 'private',
    participants: { $all: [userId1, userId2], $size: 2 }
  }).populate('participants', 'firstName lastName username avatar role')
    .populate('messages.sender', 'firstName lastName username avatar');
};

// Method สำหรับเพิ่มข้อความใหม่
chatSchema.methods.addMessage = function(senderId, content, messageType = 'text') {
  const newMessage = {
    sender: senderId,
    content: content,
    messageType: messageType,
    timestamp: new Date()
  };
  
  this.messages.push(newMessage);
  this.lastMessage = {
    content: content,
    sender: senderId,
    timestamp: new Date()
  };
  
  return this.save();
};

// Method สำหรับมาร์คข้อความว่าอ่านแล้ว
chatSchema.methods.markAsRead = function(userId, messageIds = []) {
  if (messageIds.length === 0) {
    // มาร์คข้อความทั้งหมดว่าอ่านแล้ว
    this.messages.forEach(message => {
      const alreadyRead = message.readBy.some(read => read.user.toString() === userId.toString());
      if (!alreadyRead && message.sender.toString() !== userId.toString()) {
        message.readBy.push({ user: userId });
      }
    });
  } else {
    // มาร์คข้อความที่ระบุว่าอ่านแล้ว
    messageIds.forEach(msgId => {
      const message = this.messages.id(msgId);
      if (message) {
        const alreadyRead = message.readBy.some(read => read.user.toString() === userId.toString());
        if (!alreadyRead && message.sender.toString() !== userId.toString()) {
          message.readBy.push({ user: userId });
        }
      }
    });
  }
  
  return this.save();
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
