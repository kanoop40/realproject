const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
  // ลงทะเบียนผู้ใช้ใหม่
  register: async (req, res) => {
    try {
      const {
        username,
        password,
        email,
        firstName,
        lastName,
        faculty,
        major,
        groupCode,
        role
      } = req.body;

      // ตรวจสอบว่ามี username หรือ email ซ้ำหรือไม่
      const userExists = await User.findOne({ 
        $or: [{ username }, { email }] 
      });

      if (userExists) {
        return res.status(400).json({ 
          message: 'Username หรือ Email นี้ถูกใช้งานแล้ว' 
        });
      }

      // เข้ารหัสรหัสผ่าน
      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = new User({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        faculty,
        major,
        groupCode,
        role,
        status: 'active'
      });

      await newUser.save();

      res.status(201).json({ 
        message: 'ลงทะเบียนสำเร็จ' 
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการลงทะเบียน' 
      });
    }
  },

  // เข้าสู่ระบบ
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ 
          message: 'ไม่พบผู้ใช้งาน' 
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          message: 'รหัสผ่านไม่ถูกต้อง' 
        });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          faculty: user.faculty,
          major: user.major,
          groupCode: user.groupCode,
          avatar: user.avatar
        }
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
      });
    }
  }
};

module.exports = authController;