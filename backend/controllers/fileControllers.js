const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const File = require('../models/FileModel');

// กำหนดค่าการจัดเก็บไฟล์
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads';
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์แบบสุ่มเพื่อป้องกันการซ้ำ
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// กำหนดการกรองไฟล์
const fileFilter = (req, file, cb) => {
  // ประเภทไฟล์ที่อนุญาต
  const allowedTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'audio/mpeg',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]);

  if (allowedTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: PDF, Word, Excel, Images, Video, Audio'), false);
  }
};

// กำหนดค่า multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // จำกัดขนาด 25MB
  }
});

// อัพโหลดไฟล์
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // สร้างข้อมูลไฟล์ในฐานข้อมูล
  const file = await File.create({
    originalName: req.file.originalname,
    encodedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    url: `${baseUrl}/uploads/${req.file.filename}`,
    uploadedBy: req.user._id,
    chatId: req.body.chatId || null
  });

  res.status(201).json(file);
});

// ดาวน์โหลดไฟล์
const downloadFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  const file = await File.findById(fileId);
  if (!file || file.status === 'deleted') {
    res.status(404);
    throw new Error('File not found');
  }

  res.download(file.path, file.originalName);
});

// ลบไฟล์ (Soft Delete)
const deleteFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  const file = await File.findById(fileId);
  if (!file) {
    res.status(404);
    throw new Error('File not found');
  }

  // ตรวจสอบสิทธิ์
  if (file.uploadedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this file');
  }

  file.status = 'deleted';
  await file.save();

  res.json({ message: 'File deleted successfully' });
});

module.exports = {
  upload,
  uploadFile,
  downloadFile,
  deleteFile
};