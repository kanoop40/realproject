const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// ดึงสมาชิกในกลุ่ม
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', 'name username role');
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    res.json(group.members);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// เพิ่มสมาชิกในกลุ่ม
router.post('/:groupId/add-member', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // ต้องเป็น admin หรือหัวหน้ากลุ่มเท่านั้น
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Permission denied' });

    const { userId } = req.body;
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }
    res.json({ msg: 'Member added', group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ลบสมาชิกออกจากกลุ่ม
router.post('/:groupId/remove-member', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // ต้องเป็น admin หรือหัวหน้ากลุ่มเท่านั้น
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Permission denied' });

    const { userId } = req.body;
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();
    res.json({ msg: 'Member removed', group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// โยนหัวหน้ากลุ่ม (เปลี่ยน admin)
router.post('/:groupId/transfer-admin', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // ต้องเป็นหัวหน้ากลุ่มเท่านั้น (หรือ admin)
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Permission denied' });

    const { newAdminId } = req.body;
    if (!group.members.includes(newAdminId))
      return res.status(400).json({ msg: 'New admin must be a group member' });

    group.admin = newAdminId;
    await group.save();
    res.json({ msg: 'Admin transferred', group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ลบกลุ่ม
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // ต้องเป็นหัวหน้ากลุ่มเท่านั้น (หรือ admin)
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Permission denied' });

    await group.deleteOne();
    res.json({ msg: 'Group deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ปิด/เปิดสิทธิ์ให้สมาชิกส่งข้อความ
router.post('/:groupId/set-send-permission', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // ต้องเป็นหัวหน้ากลุ่มเท่านั้น (หรือ admin)
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Permission denied' });

    group.isOnlyAdminCanSend = req.body.isOnlyAdminCanSend;
    await group.save();
    res.json({ msg: 'Send permission updated', group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ดึงสมาชิกเข้ากลุ่มอัตโนมัติตาม role
router.post('/:groupId/auto-add-members', auth, async (req, res) => {
  try {
    const { role } = req.body; // 'student', 'staff'
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // ต้องเป็นหัวหน้ากลุ่มเท่านั้น (หรือ admin)
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Permission denied' });

    const users = await User.find({ role });
    const newMembers = users
      .map(u => u._id.toString())
      .filter(id => !group.members.map(m => m.toString()).includes(id));
    group.members.push(...newMembers);
    await group.save();
    res.json({ msg: 'Auto-added members', group });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// แสดงจำนวนสมาชิกในกลุ่ม
router.get('/:groupId/member-count', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    res.json({ count: group.members.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;