const express = require('express');
const router = express.Router();
const { loginUser, checkAuthStatus } = require('../controllers/authController');
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

// @route   GET /api/auth/status
// @desc    Check auth status
// @access  Private
router.get('/status', protect, checkAuthStatus);

module.exports = router;
