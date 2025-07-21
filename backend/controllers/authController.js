const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password: password ? '[PROVIDED]' : '[MISSING]' });

    // หาผู้ใช้จาก username
    const user = await User.findOne({ username });
    console.log('User found:', user ? user.username : 'null');

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isPasswordMatch);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // สร้าง token
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET value:', process.env.JWT_SECRET ? '[SET]' : '[NOT SET]');
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      token: token
    });
  } catch (error) {
    console.log('Login error:', error.message);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// @desc    Check auth status
// @route   GET /api/auth/status
// @access  Private
const checkAuthStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  loginUser,
  checkAuthStatus
};
