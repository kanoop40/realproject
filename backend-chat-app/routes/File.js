const express = require('express');
const router = express.Router();
const File = require('../models/File');
const multer = require('multer');
const auth = require('../middleware/auth');
const path = require('path');

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

// อัปโหลดไฟล์
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  const { chatId } = req.body;
  const file = await File.create({
    uploader: req.user.id,
    chat: chatId,
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType: req.file.mimetype
  });
  res.json(file);
});

// ดูไฟล์ทั้งหมดของ user
router.get('/my', auth, async (req, res) => {
  const files = await File.find({ uploader: req.user.id }).sort({ uploadedAt: -1 });
  res.json(files);
});

// ดูไฟล์ทั้งหมดในระบบ (admin เท่านั้น)
router.get('/all', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Permission denied' });
  const files = await File.find().populate('uploader').sort({ uploadedAt: -1 });
  res.json(files);
});

module.exports = router;