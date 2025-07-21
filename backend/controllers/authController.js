const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  try {
    // หาผู้ใช้จาก username
    const user = await User.findOne({ username });

    if (!user) {
      res.status(401);
      throw new Error('Invalid username or password');
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      res.status(401);
      throw new Error('Invalid username or password');
    }

    // สร้าง token
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
    res.status(401);
    throw new Error('Login failed');
  }
});

// @desc    Check auth status
// @route   GET /api/auth/status
// @access  Private
const checkAuthStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    res.status(401);
    throw new Error('User not found');
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
});

module.exports = {
  loginUser,
  checkAuthStatus
};
