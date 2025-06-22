const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/create', auth, upload.single('groupAvatar'), chatController.createChat);
router.get('/user-chats', auth, chatController.getUserChats);
router.get('/:chatId/messages', auth, chatController.getChatMessages);

module.exports = router;