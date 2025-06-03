const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', FileSchema);