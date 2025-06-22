const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/send', 
  auth, 
  upload.single('file'), 
  messageController.sendMessage
);
router.delete('/:messageId', auth, messageController.deleteMessage);

module.exports = router;