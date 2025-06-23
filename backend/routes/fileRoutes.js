const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  upload, 
  uploadFile, 
  downloadFile, 
  deleteFile 
} = require('../controllers/fileController');

// Routes สำหรับจัดการไฟล์
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/download/:fileId', protect, downloadFile);
router.delete('/:fileId', protect, deleteFile);

module.exports = router;