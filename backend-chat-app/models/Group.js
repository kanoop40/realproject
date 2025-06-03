const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String }, // รูปกลุ่ม
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // หัวหน้ากลุ่ม
  isOnlyAdminCanSend: { type: Boolean, default: false }, // ปิด/เปิดให้สมาชิกส่งข้อความ
  createdAt: { type: Date, default: Date.now },
  mute_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // ผู้ปิดแจ้งเตือน
  member_count: { type: Number, default: 0 }
});

module.exports = mongoose.model('Group', GroupSchema);