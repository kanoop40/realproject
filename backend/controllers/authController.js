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

    // อัปเดตสถานะออนไลน์และเวลา login ล่าสุด
    await User.findByIdAndUpdate(user._id, { 
      isOnline: true,
      lastLogin: new Date(),
      lastSeen: new Date()
    });

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

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    // อัปเดตสถานะออฟไลน์
    await User.findByIdAndUpdate(req.user._id, { 
      isOnline: false,
      lastSeen: new Date()
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed', error: error.message });
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

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('firstName lastName name email avatar role')
      .sort({ firstName: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  loginUser,
  logoutUser,
  checkAuthStatus,
  getAllUsers
};
