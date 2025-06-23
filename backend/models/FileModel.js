
const mongoose = require('mongoose');

const fileSchema = mongoose.Schema(
  {
    file_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
    Messages_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true
    },
    chat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chatroom',
      required: true
    },
    size: {
      type: String,
      required: true
    },
    file_type: {
      type: String,
      required: true
    }
  }
);