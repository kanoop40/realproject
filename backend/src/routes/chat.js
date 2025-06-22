const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Get all chats for current user
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      user_id: req.user._id
    })
    .populate('lastMessage')
    .populate('user_id', 'firstName lastName avatar isOnline')
    .sort('-updatedAt');
    
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new chat
router.post('/', auth, async (req, res) => {
  try {
    const { type, userIds, roomName, description } = req.body;

    // Add current user to chat members
    if (!userIds.includes(req.user._id)) {
      userIds.push(req.user._id);
    }

    const newChat = await Chat.create({
      type,
      user_id: userIds,
      roomName,
      description,
      admins: [req.user._id] // creator is admin by default
    });

    // Populate user details
    const chat = await Chat.findById(newChat._id)
      .populate('user_id', 'firstName lastName avatar isOnline');

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific chat
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      user_id: req.user._id
    })
    .populate('user_id', 'firstName lastName avatar isOnline')
    .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update chat
router.put('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      admins: req.user._id // only admins can update
    });

    if (!chat) {
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      chat[key] = updates[key];
    });

    await chat.save();
    
    const updatedChat = await Chat.findById(chat._id)
      .populate('user_id', 'firstName lastName avatar isOnline')
      .populate('lastMessage');

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete chat
router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      admins: req.user._id // only admins can delete
    });

    if (!chat) {
      return res.status(404).json({ message: 'ไม่พบแชทที่ต้องการ' });
    }

    // Delete all messages in chat
    await Message.deleteMany({ chat_id: chat._id });
    
    // Delete chat
    await chat.remove();

    res.json({ message: 'ลบแชทเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;