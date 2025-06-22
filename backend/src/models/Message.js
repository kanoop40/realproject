const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messages_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    primary: true
  },
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chatroom',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  },
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }
});

module.exports = mongoose.model('Message', messageSchema);