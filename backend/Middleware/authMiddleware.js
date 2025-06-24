const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');

const protect = asyncHandler(async (req, res, next) => {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('Processing token:', token);

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);

            // ใช้ lean() เพื่อดูข้อมูลดิบ
            const user = await User.findById(decoded.id).lean();
            console.log('Found user:', user);

            if (!user) {
                console.log('User not found for ID:', decoded.id);
                res.status(401);
                throw new Error('User not found in database');
            }

            req.user = user;
            next();

        } catch (error) {
            console.error('Auth Error:', error);
            res.status(401);
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else {
                throw new Error(`Authorization failed: ${error.message}`);
            }
        }
    } else {
        res.status(401);
        throw new Error('No token provided');
    }
});

module.exports = { protect };