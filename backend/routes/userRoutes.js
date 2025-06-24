const express = require('express');
const router = express.Router();
const {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUsers,        // เพิ่ม getUsers
    deleteUser,
    updateUser    // เพิ่ม deleteUser
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
router.route('/')
    .get(protect, admin, getUsers);

router.route('/:id')
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);
    
    // เพิ่ม admin middleware
module.exports = router;