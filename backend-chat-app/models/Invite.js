const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  inviter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invite', InviteSchema);