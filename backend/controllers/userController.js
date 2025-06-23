const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400); // Bad Request
        throw new Error('User already exists');
    }

    const user = await User.create({
        username,
        email,
        password, // password will be hashed by the pre-save hook in the model
        firstName,
        lastName,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // ค้นหาผู้ใช้จากอีเมลในฐานข้อมูล
    const user = await User.findOne({ email });

    // ตรวจสอบว่ามีผู้ใช้ และรหัสผ่านตรงกันหรือไม่
    // (เราจะใช้เมธอด matchPassword ที่เราสร้างไว้ใน userModel)
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            token: generateToken(user._id),
        });
    } else {
        res.status(401); // Unauthorized
        throw new Error('Invalid email or password');
    }
});


module.exports = { registerUser, authUser };