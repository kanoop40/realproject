const express = require('express');
const router = express.Router();
const User = require('../models/User');

// สมัครสมาชิก
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, studentId, role, faculty, department, level, major, groupCode, avatarUrl } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(409).json({ message: 'อีเมลนี้ถูกใช้ไปแล้ว' });

    const user = new User({ email, password, fullName, studentId, role, faculty, department, level, major, groupCode, avatarUrl });
    await user.save();
    res.json({ message: 'สมัครสมาชิกสำเร็จ', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// เข้าสู่ระบบ (ตัวอย่างง่าย ไม่ได้เข้ารหัส)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  res.json({ message: 'เข้าสู่ระบบสำเร็จ', user });
});

// ดึงข้อมูลผู้ใช้ทั้งหมด
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

module.exports = router;