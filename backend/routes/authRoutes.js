const express = require('express');
const router = express.Router();
const { loginUser, logoutUser, checkAuthStatus, getAllUsers } = require('../controllers/authController');
const { protect } = require('../Middleware/authMiddleware');

// @route   GET /api/auth/health
// @desc    Health check (public)
// @access  Public
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, logoutUser);

// @route   GET /api/auth/status
// @desc    Check auth status
// @access  Private
router.get('/status', protect, checkAuthStatus);

// @route   GET /api/auth/users
// @desc    Get all users (for adding to groups)
// @access  Private
router.get('/users', protect, getAllUsers);

module.exports = router;
