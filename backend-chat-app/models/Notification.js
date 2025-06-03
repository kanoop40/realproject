const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ผู้รับแจ้งเตือน
  type: { type: String, required: true },        // ประเภท เช่น 'chat', 'group', 'system'
  content: { type: String, required: true },     // ข้อความแจ้งเตือน
  link: { type: String },                        // ลิงก์ไปยังหน้าที่เกี่ยวข้อง
  isRead: { type: Boolean, default: false },     // อ่าน/ยัง
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);