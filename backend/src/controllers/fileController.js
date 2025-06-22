const File = require('../models/File');
const { uploadToCloudStorage, deleteFromCloudStorage } = require('../utils/cloudStorage');

const fileController = {
  // อัพโหลดไฟล์
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          message: 'กรุณาเลือกไฟล์' 
        });
      }

      // อัพโหลดไฟล์ไปยัง Cloud Storage
      const cloudUrl = await uploadToCloudStorage(req.file);

      const newFile = new File({
        file_name: req.file.originalname,
        url: cloudUrl,
        user_id: req.user._id,
        chat_id: req.body.chatId,
        messages_id: req.body.messageId,
        size: req.file.size,
        file_type: req.file.mimetype
      });

      await newFile.save();

      res.status(201).json({
        message: 'อัพโหลดไฟล์สำเร็จ',
        file: newFile
      });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์'
      });
    }
  },

  // ดาวน์โหลดไฟล์
  downloadFile: async (req, res) => {
    try {
      const { fileId } = req.params;
      const file = await File.findById(fileId);

      if (!file) {
        return res.status(404).json({ 
          message: 'ไม่พบไฟล์' 
        });
      }

      // ตรวจสอบสิทธิ์การเข้าถึง
      const chat = await Chatroom.findById(file.chat_id);
      if (!chat.user_id.includes(req.user._id)) {
        return res.status(403).json({
          message: 'คุณไม่มีสิทธิ์เข้าถึงไฟล์นี้'
        });
      }

      res.json({ downloadUrl: file.url });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์'
      });
    }
  }
};

module.exports = fileController;