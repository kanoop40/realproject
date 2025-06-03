const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ผู้กระทำ
  action: { type: String, required: true },                    // เช่น login, upload, delete
  detail: { type: String },                                    // รายละเอียดเพิ่มเติม
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema);