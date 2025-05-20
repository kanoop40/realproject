const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  role: { type: String, enum: ['admin', 'teacher', 'staff', 'student'], default: 'student' },
  studentId: String,
  department: String,
  image: String
});
module.exports = mongoose.model('User', UserSchema);