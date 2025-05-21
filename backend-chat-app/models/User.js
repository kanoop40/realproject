const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // รหัสนักศึกษา/พนักงาน
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['admin', 'teacher', 'staff', 'student'], default: 'student' },
  studentId: String,
  department: String,
  image: String // URL รูปโปรไฟล์
});

module.exports = mongoose.model('User', UserSchema);