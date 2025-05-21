const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'file'], default: 'text' },
  fileUrl: { type: String }, // ถ้าเป็นไฟล์
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // group หรือห้องแชท
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // สำหรับแสดงว่าใครอ่านแล้ว
});

module.exports = mongoose.model('Chat', ChatSchema);