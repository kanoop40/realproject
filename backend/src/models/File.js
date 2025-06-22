const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
    primary: true
  },
  file_name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chatroom',
    required: true
  },
  size: Number,
  file_type: String
});

module.exports = mongoose.model('File', fileSchema);