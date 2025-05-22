const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ส่งข้อความพร้อมไฟล์
router.post('/sendfile', auth, upload.single('file'), async (req, res) => {
  const { content, chatRoom } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const chat = await Chat.create({
    sender: req.user.id,
    content,
    type: fileUrl ? 'file' : 'text',
    fileUrl,
    chatRoom
  });
  res.json(chat);
});

// ส่งข้อความอย่างเดียว
router.post('/send', auth, async (req, res) => {
  const { content, chatRoom } = req.body;
  const chat = await Chat.create({
    sender: req.user.id,
    content,
    type: 'text',
    chatRoom
  });
  res.json(chat);
});

module.exports = router;