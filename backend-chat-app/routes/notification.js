const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// ดูแจ้งเตือนทั้งหมดของ user
router.get('/', auth, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
});

// ตั้งเป็นอ่านแล้ว
router.put('/:id/read', auth, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ msg: 'Marked as read' });
});

// ลบแจ้งเตือน
router.delete('/:id', auth, async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ msg: 'Notification deleted' });
});

module.exports = router;