const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const File = require('../models/File');
const Chat = require('../models/Chat');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.body;

    // ตรวจสอบว่าผู้ใช้อยู่ในแชทนี้
    const chat = await Chat.findOne({
      _id: chatId,
      user_id: req.user._id
    });

    if (!chat) {
      await fs.unlink(req.file.path);
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    let thumbnail = null;

    // สร้าง thumbnail สำหรับรูปภาพ
    if (req.file.mimetype.startsWith('image/')) {
      const thumbnailPath = path.join('uploads/thumbnails', req.file.filename);
      await sharp(req.file.path)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      thumbnail = thumbnailPath;
    }

    // บันทึกข้อมูลไฟล์
    const file = await File.create({
      file_name: req.file.originalname,
      url: req.file.path,
      user_id: req.user._id,
      chat_id: chatId,
      size: req.file.size,
      file_type: req.file.mimetype,
      thumbnail: thumbnail
    });

    res.status(201).json(file);
  } catch (error) {
    // ลบไฟล์ถ้าเกิดข้อผิดพลาด
    if (req.file) {
      await fs.unlink(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
});

// Get file info
router.get('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id
    })
    .populate('user_id', 'firstName lastName');

    if (!file) {
      return res.status(404).json({ message: 'ไม่พบไฟล์ที่ต้องการ' });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงไฟล์
    const chat = await Chat.findOne({
      _id: file.chat_id,
      user_id: req.user._id
    });

    if (!chat) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้' });
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download file
router.get('/:id/download', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'ไม่พบไฟล์ที่ต้องการ' });
    }

    // ตรวจสอบสิทธิ์
    const chat = await Chat.findOne({
      _id: file.chat_id,
      user_id: req.user._id
    });

    if (!chat) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้' });
    }

    res.download(file.url, file.file_name);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete file
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!file) {
      return res.status(404).json({ message: 'ไม่พบไฟล์ที่ต้องการ' });
    }

    // ลบไฟล์จากระบบ
    await fs.unlink(file.url);
    if (file.thumbnail) {
      await fs.unlink(file.thumbnail);
    }

    await file.remove();
    res.json({ message: 'ลบไฟล์เรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get chat files
router.get('/chat/:chatId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // ตรวจสอบสิทธิ์
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      user_id: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    const files = await File.find({ chat_id: req.params.chatId })
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user_id', 'firstName lastName');

    const count = await File.countDocuments({ chat_id: req.params.chatId });

    res.json({
      files,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;