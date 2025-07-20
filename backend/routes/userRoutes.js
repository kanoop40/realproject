const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUsers,
    deleteUser,
    createUser,
    updateUser,
    searchUsers,
    getUserById,
    getCurrentUser,
    updateProfile,
    uploadAvatar
} = require('../controllers/userController');
const { protect, admin } = require('../Middleware/authMiddleware');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('ไฟล์ที่อัพโหลดต้องเป็นรูปภาพเท่านั้น'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});

// Public routes
router.post('/login', authUser);

// Search route ต้องอยู่ก่อน /:id
router.get('/search', protect, searchUsers);

// Get current user route
router.get('/current', protect, getCurrentUser);

// Update profile route
router.put('/update-profile', protect, updateProfile);

// Upload avatar route
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);

// Protected routes
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// Admin routes
router.route('/')
    .get(protect, admin, getUsers)
    .post(protect, admin, createUser);

// ย้าย route /:id ไปไว้ด้านล่างสุด
router.route('/:id')
    .get(protect, getUserById)
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

module.exports = router;