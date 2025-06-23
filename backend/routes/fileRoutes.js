const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    uploadFile,
    downloadFile,
    deleteFile,
    getFileInfo
} = require('../controllers/fileController');

// File routes
router.post('/upload', protect, uploadFile);
router.get('/:fileId', protect, downloadFile);
router.delete('/:fileId', protect, deleteFile);
router.get('/info/:fileId', protect, getFileInfo);

module.exports = router;