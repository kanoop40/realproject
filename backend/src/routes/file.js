const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { upload, handleUploadError } = require('../middlewares/upload');
const auth = require('../middlewares/auth');

router.post('/upload',
  auth,
  upload.single('file'),
  handleUploadError,
  fileController.uploadFile
);

router.get('/:fileId/download',
  auth,
  fileController.downloadFile
);

module.exports = router;