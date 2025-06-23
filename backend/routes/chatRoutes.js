const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const {
    accessChat,
    createGroupChat,
    sendMessage,
    getMessages,
    deleteMessage
} = require('../controllers/chatController');

// Chat routes
router.route('/').post(protect, accessChat);
router.route('/group').post(protect, createGroupChat);
router.route('/message').post(protect, sendMessage);
router.route('/messages/:chatId').get(protect, getMessages);
router.route('/message/:messageId').delete(protect, deleteMessage);

module.exports = router;