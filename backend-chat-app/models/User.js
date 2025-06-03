const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // รหัสนักศึกษา/พนักงาน
  password: { type: String, required: true },
  email: { type: String, unique: true },
  firstName: String,
  lastName: String,
  faculty: String,
  major: String,
  groupCode: String,
  avatar: String, // URL รูปโปรไฟล์
  role: { type: String, enum: ['admin', 'teacher', 'staff', 'student'], default: 'student' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
});

module.exports = mongoose.model('User', UserSchema);