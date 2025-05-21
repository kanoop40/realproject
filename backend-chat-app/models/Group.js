const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String }, // รูปกลุ่ม
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // หัวหน้ากลุ่ม
  isOnlyAdminCanSend: { type: Boolean, default: false }, // ปิด/เปิดให้สมาชิกส่งข้อความ
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);