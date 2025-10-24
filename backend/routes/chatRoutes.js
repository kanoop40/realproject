const express = require('express');
const router = express.Router();
const {
    getChats,
    getMessages,
    sendMessage,
    createChatroom,
    createPrivateChat,
    markAsRead,
    getMessageReadCounts,
    deleteChatroom,
    hideChatrooms,
    deleteMessage,
    editMessage,
    markMessageAsRead,
    getUnreadCount,
    markAllAsRead,
    getChatParticipants,
    checkNewMessages
} = require('../controllers/newChatController');
const { protect } = require('../Middleware/authMiddleware');

// File upload configuration
const { fileStorage } = require('../config/cloudinary');
const multer = require('multer');

// Add error handling for multer with better configuration
const uploadMessage = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024, // 50MB for field data
    fieldNameSize: 255,
    fields: 10,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Multer processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    // Accept all file types
    cb(null, true);
  }
});

// Multer error handling middleware
const handleMulterError = (error, req, res, next) => {
  console.error('❌ Multer Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'ไฟล์ใหญ่เกินไป ขนาดสูงสุด 50MB' 
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'รูปแบบไฟล์ไม่ถูกต้อง' 
      });
    }
  }
  
  return res.status(500).json({ 
    message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์',
    error: error.message 
  });
};

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/chats
// @desc    Get all chatrooms for current user
// @access  Private
router.get('/', getChats);

// @route   POST /api/chats
// @desc    Create new chatroom
// @access  Private
router.post('/', createChatroom);

// @route   POST /api/chats/private
// @desc    Create or get private chat between two users
// @access  Private
router.post('/private', createPrivateChat);

// @route   POST /api/chats/hide
// @desc    Hide chatrooms for current user (soft delete)
// @access  Private
router.post('/hide', hideChatrooms);

// @route   GET /api/chats/:id/messages
// @desc    Get messages for a chatroom
// @access  Private
router.get('/:id/messages', getMessages);

// Middleware to conditionally apply multer with better error handling
const conditionalUpload = (req, res, next) => {
  console.log('🔍 Request details:', {
    contentType: req.get('Content-Type'),
    method: req.method,
    url: req.url,
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body || {}),
    contentLength: req.get('Content-Length')
  });
  
  // Only apply multer for multipart/form-data requests
  if (req.get('Content-Type')?.includes('multipart/form-data')) {
    console.log('📎 Multipart request detected - applying multer');
    
    // Use single('file') for more predictable behavior
    const upload = uploadMessage.single('file');
    
    upload(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error details:', {
          code: err.code,
          message: err.message,
          field: err.field,
          stack: err.stack
        });
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: 'ไฟล์ใหญ่เกินไป ขนาดสูงสุด 50MB' 
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ 
            message: 'รูปแบบไฟล์ไม่ถูกต้อง' 
          });
        }
        return res.status(500).json({
          message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์',
          error: err.message,
          code: err.code
        });
      }
      
      console.log('📎 Multer success:', {
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body || {}),
        fileDetails: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      });
      
      next();
    });
  } else {
    console.log('💬 Regular JSON request - skipping multer');
    next();
  }
};

// Debug middleware to verify routing
const debugBeforeSendMessage = (req, res, next) => {
  console.log('🎯 About to call sendMessage controller');
  console.log('🎯 Request params:', req.params);
  console.log('🎯 Request body:', req.body);
  console.log('🎯 Request file:', req.file ? 'Present' : 'Not present');
  next();
};

// Debug middleware for detailed logging
const detailedDebug = (req, res, next) => {
  console.log('\n🔥🔥🔥 DETAILED REQUEST DEBUG 🔥🔥🔥');
  console.log('📨 Request Method:', req.method);
  console.log('📨 Content-Type:', req.get('Content-Type'));
  console.log('📨 Body Keys:', Object.keys(req.body));
  console.log('📨 Body Content:', req.body);
  console.log('📨 Files Array:', req.files);
  console.log('📨 Files Length:', req.files ? req.files.length : 0);
  console.log('📨 Single File:', req.file);
  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
      console.log(`📁 File ${index}:`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
    });
  }
  console.log('🔥🔥🔥 END DEBUG 🔥🔥🔥\n');
  next();
};

// @route   POST /api/chats/:id/messages
// @desc    Send message with optional file
// @access  Private  
router.post('/:id/messages', conditionalUpload, detailedDebug, debugBeforeSendMessage, sendMessage);

// @route   GET /api/chats/:id/participants
// @desc    Get chat participants
// @access  Private
router.get('/:id/participants', getChatParticipants);

// @route   GET /api/chats/:id/unread-count
// @desc    Get unread messages count
// @access  Private
router.get('/:id/unread-count', getUnreadCount);

// @route   GET /api/chats/:id/check-new
// @desc    Check for new messages (Smart Heartbeat)
// @access  Private
router.get('/:id/check-new', checkNewMessages);

// @route   PUT /api/chats/:id/read
// @desc    Mark messages as read
// @access  Private
router.put('/:id/read', protect, markAsRead);

// @route   GET /api/chats/:id/read-counts
// @desc    Get read counts for messages in group chat
// @access  Private
router.get('/:id/read-counts', protect, getMessageReadCounts);

// @route   POST /api/chats/:id/read-all
// @desc    Mark all messages in chat as read
// @access  Private
router.post('/:id/read-all', markAllAsRead);

// @route   DELETE /api/chats/:id
// @desc    Delete chatroom
// @access  Private
router.delete('/:id', deleteChatroom);

// @route   DELETE /api/chats/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/messages/:id', deleteMessage);

// @route   DELETE /api/chats/:chatroomId/messages/:messageId
// @desc    Delete a message from specific chatroom
// @access  Private
router.delete('/:chatroomId/messages/:messageId', deleteMessage);

// @route   PUT /api/chats/messages/:id
// @desc    Edit a message
// @access  Private
router.put('/messages/:id', require('../controllers/newChatController').editMessage);

// @route   POST /api/chats/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.post('/messages/:id/read', markMessageAsRead);

// File upload is now handled by the /messages route above

module.exports = router;
