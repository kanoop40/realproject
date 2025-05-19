const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  type: { type: String, enum: ["private", "group"], required: true },
  name: String, // ถ้าเป็นกลุ่ม
  avatarUrl: String,
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ["owner", "member", "admin"], default: "member" }
  }],
  groupSetting: {
    mute: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    onlyOwnerCanSend: { type: Boolean, default: false }
  },
  autoAddRule: {
    enabled: { type: Boolean, default: false },
    by: { type: String, enum: ["groupCode", "faculty", "major"] }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);