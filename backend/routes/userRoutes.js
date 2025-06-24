const express = require('express');
const router = express.Router();
const {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUsers,
    deleteUser,
    updateUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', authUser);

// Protected routes
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// Admin routes
router.get('/', protect, admin, getUsers); // แก้ไขลำดับ middleware
router.route('/:id')
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

module.exports = router;