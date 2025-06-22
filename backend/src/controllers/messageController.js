const Message = require('../models/Message');
const Notification = require('../models/Notification');
const File = require('../models/File');

const messageController = {
  // ส่งข้อความใหม่
  sendMessage: async (req, res) => {
    try {
      const { chatId, content } = req.body;
      const sender = req.user._id;

      let fileId;
      if (req.file) {
        const newFile = new File({
          file_name: req.file.originalname,
          url: req.file.path,
          user_id: sender,
          chat_id: chatId,
          size: req.file.size,
          file_type: req.file.mimetype
        });
        const savedFile = await newFile.save();
        fileId = savedFile._id;
      }

      const newMessage = new Message({
        chat_id: chatId,
        user_id: sender,
        content,
        file_id: fileId
      });

      await newMessage.save();

      // สร้างการแจ้งเตือนสำหรับผู้ใช้อื่นในห้องแชท
      const chat = await Chatroom.findById(chatId);
      const otherUsers = chat.user_id.filter(uid => uid.toString() !== sender.toString());

      await Promise.all(otherUsers.map(userId => {
        return new Notification({
          user_id: userId,
          type: 'new_message',
          Messages: 'คุณมีข้อความใหม่',
          chat_id: chatId,
          messages_id: newMessage._id
        }).save();
      }));

      res.status(201).json({
        message: 'ส่งข้อความสำเร็จ',
        newMessage
      });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
      });
    }
  },

  // ลบข้อความ
  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await Message.findById(messageId);

      if (!message) {
        return res.status(404).json({
          message: 'ไม่พบข้อความ'
        });
      }

      if (message.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: 'คุณไม่มีสิทธิ์ลบข้อความนี้'
        });
      }

      await Message.findByIdAndDelete(messageId);

      res.json({ message: 'ลบข้อความสำเร็จ' });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการลบข้อความ'
      });
    }
  }
};

module.exports = messageController;