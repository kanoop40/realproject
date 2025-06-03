const Invite = require('../models/Invite');
const Group = require('../models/Group');
const User = require('../models/User');

exports.getUserInvites = async (req, res) => {
  const invites = await Invite.find({ invitee: req.user.id }).populate('group inviter');
  res.json(invites);
};

exports.sendInvite = async (req, res) => {
  const { groupId, inviteeId } = req.body;
  // ตรวจสอบสิทธิ์เชิญในกลุ่มก่อน (ตัวอย่าง: เฉพาะ admin หรือหัวหน้า)
  // สามารถเสริม logic ตรวจสอบที่นี่
  const invite = await Invite.create({
    group: groupId,
    inviter: req.user.id,
    invitee: inviteeId,
    status: 'pending'
  });
  res.json(invite);
};

exports.respondInvite = async (req, res) => {
  const { status } = req.body; // 'accepted' หรือ 'rejected'
  const invite = await Invite.findByIdAndUpdate(req.params.id, { status }, { new: true });
  // ถ้าตอบรับ ให้เพิ่ม user เข้ากลุ่ม
  if (status === 'accepted' && invite) {
    const group = await Group.findById(invite.group);
    if (group && !group.members.includes(invite.invitee)) {
      group.members.push(invite.invitee);
      await group.save();
    }
  }
  res.json(invite);
};