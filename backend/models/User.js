const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  studentId: String,
  email: { type: String, required: true, unique: true },
  password: String,
  fullName: String,
  role: { type: String, enum: ["student", "teacher", "staff", "admin"], default: "student" },
  faculty: String,
  department: String,
  level: String,
  major: String,
  groupCode: String,
  avatarUrl: String
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);