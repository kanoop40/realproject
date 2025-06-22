const Chatroom = require('../models/Chatroom');
const Message = require('../models/Message');

const chatController = {
  // สร้างห้องแชทใหม่
  createChat: async (req, res) => {
    try {
      const { roomName, participants } = req.body;
      const creator = req.user._id;

      const newChat = new Chatroom({
        roomName,
        user_id: [creator, ...participants],
        groupAvatar: req.file ? req.file.path : undefined
      });

      await newChat.save();

      res.status(201).json({
        message: 'สร้างห้องแชทสำเร็จ',
        chat: newChat
      });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท'
      });
    }
  },

  // ดึงรายการแชททั้งหมดของผู้ใช้
  getUserChats: async (req, res) => {
    try {
      const chats = await Chatroom.find({
        user_id: req.user._id
      })
      .populate('user_id', 'username firstName lastName avatar')
      .sort({ updatedAt: -1 });

      res.json(chats);
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องแชท'
      });
    }
  },

  // ดึงข้อความในห้องแชท
  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const messages = await Message.find({ chat_id: chatId })
        .populate('user_id', 'username firstName lastName avatar')
        .populate('file_id')
        .sort({ time: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json(messages);
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
      });
    }
  }
};

module.exports = chatController;