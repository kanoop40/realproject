const mongoose = require('mongoose');

// นี่คือพิมพ์เขียวสำหรับข้อมูล Task แต่ละชิ้น
const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // บังคับว่าต้องมี title
    trim: true,     // ตัดช่องว่างหน้า-หลังอัตโนมัติ
  },
  completed: {
    type: Boolean,
    default: false, // ค่าเริ่มต้นคือ "ยังทำไม่เสร็จ"
  },
  createdAt: {
    type: Date,
    default: Date.now, // ใส่วันที่สร้างให้อัตโนมัติ
  },
});

// ส่งออก Model นี้เพื่อให้ไฟล์อื่นเรียกใช้ได้
module.exports = mongoose.model('Task', TaskSchema);