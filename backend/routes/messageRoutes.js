const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// ส่งข้อความในห้องแชท
router.post('/', async (req, res) => {
  try {
    const { chatRoomId, senderId, text, file } = req.body;
    if (!chatRoomId || !senderId) return res.status(400).json({ message: 'ข้อมูลไม่ครบ' });

    const message = new Message({ chatRoomId, senderId, text, file });
    await message.save();
    res.json({ message: 'ส่งข้อความสำเร็จ', messageObj: message });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ดูข้อความในห้องแชท
router.get('/:chatRoomId', async (req, res) => {
  const { chatRoomId } = req.params;
  const messages = await Message.find({ chatRoomId }).populate('senderId', 'fullName');
  res.json(messages);
});

module.exports = router;