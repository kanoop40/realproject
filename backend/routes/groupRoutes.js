const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { groupAvatarStorage, fileStorage } = require('../config/cloudinary');
const {
    createGroup,
    getUserGroups,
    getGroupDetails,
    getGroupMembers,
    updateGroup,
    updateGroupAvatar,
    addMembers,
    inviteMembers,
    removeMember,
    leaveGroup,
    deleteGroup,
    updateAutoInviteSettings,
    searchGroups,
    sendGroupMessage,
    getGroupMessages,
    deleteGroupMessage,
    editGroupMessage,
    markGroupMessagesAsRead,
    checkNewGroupMessages
} = require('../controllers/groupChatController');
const { protect } = require('../Middleware/authMiddleware');

// Multer configuration for group avatar uploads using Cloudinary
const upload = multer({ 
    storage: groupAvatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น'));
        }
    }
});

// ใช้ middleware protect สำหรับทุก route
router.use(protect);

// @route   GET /api/groups
// @desc    ดึงรายการกลุ่มของผู้ใช้
router.get('/', getUserGroups);

// @route   GET /api/groups/search
// @desc    ค้นหากลุ่ม
router.get('/search', searchGroups);

// @route   POST /api/groups
// @desc    สร้างกลุ่มใหม่
router.post('/', upload.single('groupAvatar'), createGroup);

// @route   GET /api/groups/:id
// @desc    ดึงข้อมูลกลุ่มเฉพาะ
router.get('/:id', getGroupDetails);

// @route   GET /api/groups/:id/members
// @desc    ดึงสมาชิกกลุ่ม
router.get('/:id/members', getGroupMembers);

// @route   PUT /api/groups/:id
// @desc    อัพเดทข้อมูลกลุ่ม (ชื่อ)
router.put('/:id', updateGroup);

// @route   PUT /api/groups/:id/avatar
// @desc    อัพเดทรูปกลุ่ม
router.put('/:id/avatar', upload.single('groupAvatar'), updateGroupAvatar);

// @route   POST /api/groups/:id/members
// @desc    เพิ่มสมาชิกในกลุ่ม
router.post('/:id/members', addMembers);

// @route   DELETE /api/groups/:id
// @desc    ลบกลุ่ม
router.delete('/:id', deleteGroup);

// @route   POST /api/groups/:id/invite
// @desc    เชิญสมาชิกเข้ากลุ่ม
router.post('/:id/invite', inviteMembers);

// @route   DELETE /api/groups/:id/members/:userId
// @desc    ลบสมาชิกออกจากกลุ่ม
router.delete('/:id/members/:userId', removeMember);

// @route   POST /api/groups/:id/leave
// @desc    ออกจากกลุ่ม
router.post('/:id/leave', leaveGroup);

// @route   PUT /api/groups/:id/auto-invite
// @desc    อัพเดทการตั้งค่า Auto Invite
router.put('/:id/auto-invite', updateAutoInviteSettings);

// @route   POST /api/groups/:id/messages
// @desc    ส่งข้อความในกลุ่ม
const { fileStorage } = require('../config/cloudinary');
const multerFileUpload = require('multer')({ 
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Multer instance for group file uploads (similar to chatRoutes)

// Multer configuration for group file uploads (same as chatRoutes)
const uploadGroupMessage = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    fieldSize: 10 * 1024 * 1024, // 10MB for field data
    fieldNameSize: 1000, // Increase for longer field names
    fields: 100, // Much higher field limit
    files: 10,   // Allow multiple files
    parts: 1000,  // Much higher parts limit
    headerPairs: 2000 // High header pairs limit
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Group multer processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      encoding: file.encoding
    });
    
    // Accept all file types
    cb(null, true);
  }
});

// Improved upload middleware for group messages (same approach as chats)
const handleGroupUpload = (req, res, next) => {
  console.log('🔍 Group request details:', {
    contentType: req.get('Content-Type'),
    method: req.method,
    url: req.url,
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body || {}),
    contentLength: req.get('Content-Length')
  });
  
  // Use any() to handle React Native FormData which might send files with different field names
  const upload = uploadGroupMessage.any();
  
  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Group multer error details:', {
        code: err.code,
        message: err.message,
        field: err.field,
        stack: err.stack
      });
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: 'ไฟล์ใหญ่เกินไป ขนาดสูงสุด 10MB' 
        });
      }
      
      // If it's not a multer-specific error and content-type is not multipart, continue
      if (!req.get('Content-Type')?.includes('multipart/form-data')) {
        console.log('💬 Group non-multipart request with multer error, continuing...');
        return next();
      }
      
      return res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์',
        error: err.message,
        code: err.code
      });
    }
    
    // Handle files array from multer.any()
    if (req.files && req.files.length > 0) {
      req.file = req.files[0]; // Set the first file as req.file for backward compatibility
    }
    
    console.log('📎 Group multer processed:', {
      hasFile: !!req.file,
      filesCount: req.files ? req.files.length : 0,
      isMultipart: req.get('Content-Type')?.includes('multipart/form-data'),
      bodyKeys: Object.keys(req.body || {}),
      fileDetails: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      allFiles: req.files ? req.files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        size: f.size
      })) : []
    });
    
    next();
  });
};

router.post('/:id/messages', handleGroupUpload, sendGroupMessage);

// @route   GET /api/groups/:id/messages
// @desc    ดึงข้อความในกลุ่ม
router.get('/:id/messages', getGroupMessages);

// @route   GET /api/groups/:id/check-new
// @desc    เช็คข้อความใหม่ในกลุ่ม (Real-time sync)
router.get('/:id/check-new', protect, checkNewGroupMessages);

// @route   DELETE /api/groups/:id/messages/:messageId
// @desc    ลบข้อความในกลุ่ม
router.delete('/:id/messages/:messageId', deleteGroupMessage);

// @route   PUT /api/groups/:id/messages/:messageId
// @desc    แก้ไขข้อความในกลุ่ม
router.put('/:id/messages/:messageId', require('../controllers/groupChatController').editGroupMessage);

// @route   PUT /api/groups/:id/read
// @desc    มาร์คข้อความในกลุ่มว่าอ่านแล้ว
router.put('/:id/read', protect, markGroupMessagesAsRead);

// @route   POST /api/groups/:id/upload
// @desc    อัพโหลดไฟล์ในกลุ่ม (alias สำหรับ messages endpoint)
router.post('/:id/upload', multerFileUpload.single('file'), sendGroupMessage);

module.exports = router;
