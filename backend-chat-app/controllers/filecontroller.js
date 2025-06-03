const File = require('../models/File');

exports.uploadFile = async (req, res) => {
  const { chatId } = req.body;
  const file = await File.create({
    uploader: req.user.id,
    chat: chatId,
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType: req.file.mimetype
  });
  res.json(file);
};

exports.getUserFiles = async (req, res) => {
  const files = await File.find({ uploader: req.user.id }).sort({ uploadedAt: -1 });
  res.json(files);
};

exports.getAllFiles = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Permission denied' });
  const files = await File.find().populate('uploader').sort({ uploadedAt: -1 });
  res.json(files);
};