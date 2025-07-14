const express = require('express');
const router = express.Router();
const { 
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUsers,
    deleteUser,
    createUser,
    updateUser,
    getUserById // เพิ่มการ import
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');


// Public routes
router.post('/login', authUser);
router.get('/:id', protect, getUserById);
// Protected routes
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// Admin routes
router.route('/')
    .get(protect, admin, getUsers)
    .post(protect, admin, createUser); // เพิ่ม route สำหรับสร้างผู้ใช้

router.route('/:id')
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

module.exports = router;