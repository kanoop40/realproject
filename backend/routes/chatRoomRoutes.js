const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');

// สร้างห้องแชทใหม่
router.post('/', async (req, res) => {
  try {
    const { type, name, avatarUrl, members, groupSetting, autoAddRule, createdBy } = req.body;
    if (!type || !members || members.length === 0) return res.status(400).json({ message: 'ข้อมูลไม่ครบ' });

    const chatRoom = new ChatRoom({ type, name, avatarUrl, members, groupSetting, autoAddRule, createdBy });
    await chatRoom.save();
    res.json({ message: 'สร้างห้องแชทสำเร็จ', chatRoom });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ดูห้องแชททั้งหมด
router.get('/', async (req, res) => {
  const chatRooms = await ChatRoom.find().populate('members.userId', 'fullName email role');
  res.json(chatRooms);
});

module.exports = router;