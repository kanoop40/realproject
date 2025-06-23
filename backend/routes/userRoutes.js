const express = require('express');
const router = express.Router();
// นำเข้า authUser จาก controller
const { registerUser, authUser } = require('../controllers/userController');

// Route เดิมสำหรับการลงทะเบียน
// POST /api/users
router.route('/').post(registerUser);

// Route ใหม่สำหรับการเข้าสู่ระบบ
// POST /api/users/login
router.post('/login', authUser);


module.exports = router;