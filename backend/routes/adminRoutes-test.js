const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { checkRole } = require('../Middleware/roleMiddleware');

console.log('AdminRoutes: protect type:', typeof protect);
console.log('AdminRoutes: checkRole type:', typeof checkRole);

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes working!' });
});

// Test route with middleware
router.get('/test-auth', protect, checkRole('admin'), (req, res) => {
  res.json({ message: 'Authenticated admin route working!' });
});

module.exports = router;