const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const generateToken = require('../utils/generateToken');



const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (user) {
        await user.deleteOne();  // เปลี่ยนจาก remove() เป็น deleteOne()
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.faculty = req.body.faculty || user.faculty;
        user.major = req.body.major || user.major;
        user.groupCode = req.body.groupCode || user.groupCode;
        user.role = req.body.role || user.role;
        
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            faculty: updatedUser.faculty,
            major: updatedUser.major,
            groupCode: updatedUser.groupCode,
            role: updatedUser.role
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


const authUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    // ค้นหาผู้ใช้
    const user = await User.findOne({
        $or: [
            { email: email?.toLowerCase() },
            { username: username?.toLowerCase() }
        ]
    });
    
    console.log('Login attempt for:', email || username);
    console.log('Found user:', user);

    if (user && (await user.matchPassword(password))) {
        const token = generateToken(user._id);
        console.log('Generated token:', token); // เพิ่ม log
        
        // ทดสอบ verify token ทันที
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token verified after generation:', decoded);
        } catch (error) {
            console.error('Token verification failed:', error);
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName, faculty, major, groupCode, role } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
    const userExists = await User.findOne({ 
        $or: [
            { email: email.toLowerCase() }, 
            { username: username.toLowerCase() }
        ] 
    });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // ตรวจสอบว่า role ถูกต้องหรือไม่
    const validRoles = ['admin', 'teacher', 'student'];
    if (role && !validRoles.includes(role)) {
        res.status(400);
        throw new Error(`Invalid role. Role must be one of: ${validRoles.join(', ')}`);
    }

    // สร้างผู้ใช้ใหม่
    const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        faculty,
        major,
        groupCode,
        role: role || 'student' // ถ้าไม่ระบุ role จะเป็น student
    });

    if (user) {
        console.log('Created user:', {
            id: user._id,
            username: user.username,
            role: user.role,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: generateToken(user._id)
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            faculty: user.faculty,
            major: user.major,
            groupCode: user.groupCode,
            role: user.role
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
    const user = await User.findById(req.user._id);
    
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.faculty = req.body.faculty || user.faculty;
        user.major = req.body.major || user.major;
        user.groupCode = req.body.groupCode || user.groupCode;
        
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            faculty: updatedUser.faculty,
            major: updatedUser.major,
            groupCode: updatedUser.groupCode,
            role: updatedUser.role,
            token: generateToken(updatedUser._id)
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const createUser = asyncHandler(async (req, res) => {
  const {
    username,
    password,
    firstName,
    lastName,
    email,
    role,
    faculty,
    major,
    groupCode
  } = req.body;

  const userExists = await User.findOne({ 
    $or: [
      { email },
      { username }
    ]
  });

  if (userExists) {
    res.status(400);
    throw new Error('ผู้ใช้นี้มีอยู่ในระบบแล้ว');
  }

  const user = await User.create({
    username,
    password,
    firstName,
    lastName,
    email,
    role,
    faculty,
    major,
    groupCode
  });

  if (user) {
    res.status(201).json({
      message: 'สร้างผู้ใช้สำเร็จ'
    });
  } else {
    res.status(400);
    throw new Error('ข้อมูลผู้ใช้ไม่ถูกต้อง');
  }
});


module.exports = {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    getUsers,      // เพิ่ม getUsers
    deleteUser,
    createUser,
    updateUser     // เพิ่ม deleteUser
};