const express = require('express');
const router = express.Router();
const { loginUser, checkAuthStatus } = require('../controllers/authController');
const { protect } = require('../Middleware/authMiddleware');

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginUser);

// @route   GET /api/auth/status
// @desc    Check auth status
// @access  Private
router.get('/status', protect, checkAuthStatus);

module.exports = router;
