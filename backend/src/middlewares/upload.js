const multer = require('multer');
const path = require('path');

// กำหนดขนาดไฟล์สูงสุด (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// กำหนดประเภทไฟล์ที่อนุญาต
const ALLOWED_FILE_TYPES = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png']
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const fileType = ALLOWED_FILE_TYPES[file.mimetype];
  
  if (!fileType) {
    return cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต'), false);
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (!fileType.includes(extension.substring(1))) {
    return cb(new Error('นามสกุลไฟล์ไม่ถูกต้อง'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Middleware สำหรับจัดการ error จาก multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'ขนาดไฟล์เกิน 5MB'
      });
    }
    return res.status(400).json({
      message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์'
    });
  }
  
  if (error.message.includes('ประเภทไฟล์')) {
    return res.status(400).json({
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  handleUploadError
};