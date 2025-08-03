const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { avatarStorage } = require('../config/cloudinary');
const { 
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUsers,
    deleteUser,
    cleanupOrphanedData,
    createUser,
    updateUser,
    searchUsers,
    getUserById,
    getCurrentUser,
    updateProfile,
    uploadAvatar,
    updatePushToken,
    getUsersForGroupCreation,
    getMajors,
    getClassCodes,
    getClassCodesByMajor,
    getUsersByClassCode
} = require('../controllers/userController');
const { protect, admin } = require('../Middleware/authMiddleware');

// Multer configuration for avatar uploads using Cloudinary
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('ไฟล์ที่อัพโหลดต้องเป็นรูปภาพเท่านั้น'), false);
    }
};

const upload = multer({ 
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});

// Public routes
router.post('/login', authUser);

// Search route ต้องอยู่ก่อน /:id
router.get('/search', protect, searchUsers);

// Get users for group creation (ไม่ต้อง admin permission)
router.get('/for-group', protect, (req, res, next) => {
    console.log('🎯 Route hit: /users/for-group');
    getUsersForGroupCreation(req, res, next);
});

// Get majors for teachers
router.get('/majors', protect, getMajors);

// Get class codes for teachers
router.get('/class-codes', protect, getClassCodes);

// Get class codes by major
router.get('/class-codes-by-major/:major', protect, getClassCodesByMajor);

// Get users by class code
router.get('/by-class/:classCode', protect, getUsersByClassCode);

// Get current user route
router.get('/current', protect, getCurrentUser);

// Update profile route
router.put('/update-profile', protect, updateProfile);

// Upload avatar route (เปลี่ยนจาก upload-avatar เป็น avatar)
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

// Push token route
router.post('/push-token', protect, updatePushToken);

// Protected routes
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// Admin routes
router.route('/')
    .get(protect, admin, getUsers)
    .post(protect, admin, createUser);

// System cleanup route - เฉพาะ admin เท่านั้น
router.post('/cleanup-orphaned-data', protect, admin, cleanupOrphanedData);

// ย้าย route /:id ไปไว้ด้านล่างสุด
router.route('/:id')
    .get(protect, (req, res, next) => {
        console.log('🎯 Route hit: /users/:id with id =', req.params.id);
        getUserById(req, res, next);
    })
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

module.exports = router;