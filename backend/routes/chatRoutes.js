const express = require('express');
const router = express.Router();
const {
    getChats,
    getMessages,
    sendMessage,
    createChatroom,
    markAsRead,
    deleteChatroom
} = require('../controllers/newChatController');
const { protect } = require('../Middleware/authMiddleware');

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

// @route   GET /api/chats/:id/messages
// @desc    Get messages for a chatroom
// @access  Private
router.get('/:id/messages', getMessages);

// @route   POST /api/chats/:id/messages
// @desc    Send message with optional file
// @access  Private
router.post('/:id/messages', sendMessage);

// @route   PUT /api/chats/:id/read
// @desc    Mark messages as read
// @access  Private
router.put('/:id/read', markAsRead);

// @route   DELETE /api/chats/:id
// @desc    Delete chatroom
// @access  Private
router.delete('/:id', deleteChatroom);

module.exports = router;
