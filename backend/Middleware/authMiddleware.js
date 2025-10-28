const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');

const protect = asyncHandler(async (req, res, next) => {
    try {
        console.log('Request Headers  :', req.headers);
        
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                // แก้ไขการแยก token โดยใช้ trim() เพื่อลบช่องว่าง
                token = req.headers.authorization.split('Bearer')[1].trim();
                console.log('Extracted token:', token);

                if (!token) {
                    console.log('No token found after Bearer');
                    res.status(401);
                    throw new Error('No token provided');
                }

                // Verify token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log('Decoded token:', decoded);

                // Get user from token
                const user = await User.findById(decoded.id).select('-password');
                console.log('Found user:', user);

                if (!user) {
                    console.log('No user found with token ID');
                    res.status(401);
                    throw new Error('User not found');
                }

                req.user = user;
                next();
            } catch (error) {
                console.error('Token verification error:', error);
                res.status(401);
                throw new Error(`Invalid token: ${error.message}`);
            }
        } else {
            console.log('No Authorization header or incorrect format');
            res.status(401);
            throw new Error('Not authorized, no token provided');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401);
        throw error;
    }
});

const admin = (req, res, next) => {
    console.log('Checking admin rights for user:', req.user);
    
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

module.exports = { protect, admin };