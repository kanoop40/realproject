const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const auth = require('../middleware/auth');

// ดู log การใช้งานทั้งหมด (admin เท่านั้น)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Permission denied' });
  const logs = await Log.find().populate('user').sort({ createdAt: -1 });
  res.json(logs);
});

// เพิ่ม log (สำหรับบันทึกในระบบ)
router.post('/', auth, async (req, res) => {
  const { action, detail } = req.body;
  const log = await Log.create({
    user: req.user.id,
    action,
    detail
  });
  res.json(log);
});

module.exports = router;