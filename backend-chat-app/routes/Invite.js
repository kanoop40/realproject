const express = require('express');
const router = express.Router();
const Invite = require('../models/Invite');
const auth = require('../middleware/auth');

// ดูคำเชิญทั้งหมดที่ user ได้รับ
router.get('/', auth, async (req, res) => {
  const invites = await Invite.find({ invitee: req.user.id }).populate('group inviter');
  res.json(invites);
});

// ส่งคำเชิญ
router.post('/send', auth, async (req, res) => {
  const { groupId, inviteeId } = req.body;
  const invite = await Invite.create({
    group: groupId,
    inviter: req.user.id,
    invitee: inviteeId,
    status: 'pending'
  });
  res.json(invite);
});

// ตอบรับ/ปฏิเสธคำเชิญ
router.put('/:id/respond', auth, async (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'
  const invite = await Invite.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(invite);
});

module.exports = router;