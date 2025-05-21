const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// สร้างกลุ่ม
router.post('/create', auth, async (req, res) => {
  const { name, image, members } = req.body;
  const group = await Group.create({
    name,
    image,
    members: [req.user.id, ...members],
    admin: req.user.id
  });
  res.json(group);
});

// ดึงกลุ่มทั้งหมดที่เป็นสมาชิก
router.get('/my', auth, async (req, res) => {
  const groups = await Group.find({ members: req.user.id });
  res.json(groups);
});

// เพิ่ม/ลบสมาชิก, เปลี่ยนหัวหน้า, ปิด/เปิดส่งข้อความ, ลบกลุ่ม สามารถเพิ่ม Endpoint เพิ่มเติมได้

module.exports = router;