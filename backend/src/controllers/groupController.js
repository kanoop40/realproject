const Group = require('../models/Chatroom');
const User = require('../models/User');

const groupController = {
  // สร้างกลุ่มใหม่
  createGroup: async (req, res) => {
    try {
      const {
        roomName,
        description,
        autoJoinRules = {}
      } = req.body;

      const newGroup = new Group({
        roomName,
        description,
        user_id: [req.user._id], // ผู้สร้างกลุ่ม
        groupAvatar: req.file ? req.file.path : undefined,
        type: 'group'
      });

      // ถ้ามีการกำหนดกฎการเข้าร่วมอัตโนมัติ
      if (autoJoinRules.classrooms || autoJoinRules.studentIdPatterns) {
        // หาผู้ใช้ที่ตรงตามเงื่อนไข
        let query = { _id: { $ne: req.user._id } }; // ไม่รวมผู้สร้างกลุ่ม

        if (autoJoinRules.classrooms && autoJoinRules.classrooms.length > 0) {
          query.groupCode = { $in: autoJoinRules.classrooms };
        }

        if (autoJoinRules.studentIdPatterns && autoJoinRules.studentIdPatterns.length > 0) {
          query.username = {
            $regex: new RegExp(autoJoinRules.studentIdPatterns.join('|'))
          };
        }

        const autoJoinUsers = await User.find(query).select('_id');
        newGroup.user_id.push(...autoJoinUsers.map(u => u._id));
      }

      await newGroup.save();

      res.status(201).json({
        message: 'สร้างกลุ่มสำเร็จ',
        group: newGroup
      });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการสร้างกลุ่ม'
      });
    }
  },

  // เพิ่มสมาชิกในกลุ่ม
  addMembers: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userIds } = req.body;

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'ไม่พบกลุ่ม' });
      }

      // ตรวจสอบสิทธิ์
      if (!group.user_id.includes(req.user._id)) {
        return res.status(403).json({
          message: 'คุณไม่มีสิทธิ์จัดการกลุ่มนี้'
        });
      }

      // เพิ่มสมาชิกใหม่
      const newMembers = userIds.filter(
        id => !group.user_id.includes(id)
      );
      
      group.user_id.push(...newMembers);
      await group.save();

      res.json({
        message: 'เพิ่มสมาชิกสำเร็จ',
        group
      });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการเพิ่มสมาชิก'
      });
    }
  },

  // ลบสมาชิกออกจากกลุ่ม
  removeMembers: async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userIds } = req.body;

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'ไม่พบกลุ่ม' });
      }

      // ตรวจสอบสิทธิ์
      if (!group.user_id.includes(req.user._id)) {
        return res.status(403).json({
          message: 'คุณไม่มีสิทธิ์จัดการกลุ่มนี้'
        });
      }

      // ลบสมาชิก
      group.user_id = group.user_id.filter(
        id => !userIds.includes(id.toString())
      );
      
      await group.save();

      res.json({
        message: 'ลบสมาชิกสำเร็จ',
        group
      });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการลบสมาชิก'
      });
    }
  },

  // ออกจากกลุ่ม
  leaveGroup: async (req, res) => {
    try {
      const { groupId } = req.params;
      
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: 'ไม่พบกลุ่ม' });
      }

      group.user_id = group.user_id.filter(
        id => id.toString() !== req.user._id.toString()
      );
      
      await group.save();

      res.json({ message: 'ออกจากกลุ่มสำเร็จ' });
    } catch (error) {
      res.status(500).json({
        message: 'เกิดข้อผิดพลาดในการออกจากกลุ่ม'
      });
    }
  }
};

module.exports = groupController;