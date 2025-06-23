const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const generateToken = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName,
      faculty,
      major,
      groupCode,
      role = 'student'  // default role
    } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        faculty,
        major,
        groupCode,
        role
    });

    if (user) {
        res.status(201).json({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: generateToken(user.user_id)
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

    // Find user by email
    const user = await User.findOne({ email });

    // Check password
    if (user && (await user.matchPassword(password))) {
        res.json({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: generateToken(user.user_id)
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.user_id).select('-password');

    if (user) {
        res.json({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            faculty: user.faculty,
            major: user.major,
            groupCode: user.groupCode,
            avatar: user.avatar,
            role: user.role,
            status: user.status
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.user_id);

    if (user) {
        user.username = req.body.username || user.username;
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.email = req.body.email || user.email;
        user.faculty = req.body.faculty || user.faculty;
        user.major = req.body.major || user.major;
        user.groupCode = req.body.groupCode || user.groupCode;
        user.avatar = req.body.avatar || user.avatar;
        
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            user_id: updatedUser.user_id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            faculty: updatedUser.faculty,
            major: updatedUser.major,
            groupCode: updatedUser.groupCode,
            avatar: updatedUser.avatar,
            role: updatedUser.role,
            token: generateToken(updatedUser.user_id)
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile
};