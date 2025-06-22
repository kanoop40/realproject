const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Get messages for specific chat
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Check if user is member of chat
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      user_id: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    const messages = await Message.find({
      chat_id: req.params.chatId
    })
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('user_id', 'firstName lastName avatar')
    .populate('file_id')
    .populate('replyTo');

    const count = await Message.countDocuments({ chat_id: req.params.chatId });

    res.json({
      messages,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send new message
router.post('/', auth, async (req, res) => {
  try {
    const { chatId, content, fileId, replyToId } = req.body;

    // Check if user is member of chat
    const chat = await Chat.findOne({
      _id: chatId,
      user_id: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    const newMessage = await Message.create({
      chat_id: chatId,
      user_id: req.user._id,
      content,
      file_id: fileId,
      replyTo: replyToId
    });

    // Update chat's lastMessage
    chat.lastMessage = newMessage._id;
    await chat.save();

    // Populate message details
    const message = await Message.findById(newMessage._id)
      .populate('user_id', 'firstName lastName avatar')
      .populate('file_id')
      .populate('replyTo');

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update message
router.put('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      user_id: req.user._id // only message owner can update
    });

    if (!message) {
      return res.status(404).json({ message: 'ไม่พบข้อความที่ต้องการ' });
    }

    message.content = req.body.content;
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('user_id', 'firstName lastName avatar')
      .populate('file_id')
      .populate('replyTo');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete message
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      user_id: req.user._id // only message owner can delete
    });

    if (!message) {
      return res.status(404).json({ message: 'ไม่พบข้อความที่ต้องการ' });
    }

    // If this was the last message in chat, update chat's lastMessage
    const chat = await Chat.findById(message.chat_id);
    if (chat.lastMessage.toString() === message._id.toString()) {
      const previousMessage = await Message.findOne({
        chat_id: chat._id,
        _id: { $ne: message._id }
      }).sort('-createdAt');
      
      chat.lastMessage = previousMessage ? previousMessage._id : null;
      await chat.save();
    }

    await message.remove();
    res.json({ message: 'ลบข้อความเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;