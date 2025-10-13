const express = require('express');
const router = express.Router();
const {
    getChats,
    getMessages,
    sendMessage,
    createChatroom,
    createPrivateChat,
    markAsRead,
    deleteChatroom,
    deleteMessage,
    editMessage,
    markMessageAsRead,
    getUnreadCount,
    markAllAsRead,
    getChatParticipants
} = require('../controllers/newChatController');
const { protect } = require('../Middleware/authMiddleware');

// File upload configuration
const { fileStorage } = require('../config/cloudinary');
const multer = require('multer');

// Add error handling for multer
const uploadMessage = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Multer processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    cb(null, true); // Accept all files
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

// @route   GET /api/chats/:id/messages
// @desc    Get messages for a chatroom
// @access  Private
router.get('/:id/messages', getMessages);

// @route   POST /api/chats/:id/messages
// @desc    Send message with optional file
// @access  Private  
router.post('/:id/messages', uploadMessage.single('file'), handleMulterError, sendMessage);

// @route   GET /api/chats/:id/participants
// @desc    Get chat participants
// @access  Private
router.get('/:id/participants', getChatParticipants);

// @route   GET /api/chats/:id/unread-count
// @desc    Get unread messages count
// @access  Private
router.get('/:id/unread-count', getUnreadCount);

// @route   PUT /api/chats/:id/read
// @desc    Mark messages as read
// @access  Private
router.put('/:id/read', markAsRead);

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
