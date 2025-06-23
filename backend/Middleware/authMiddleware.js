const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');

const protect = asyncHandler(async (req, res, next) => {
    let token;
    
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token:', token);

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            console.log('Looking for user with ID:', decoded.id);

            const user = await User.findById(decoded.id);
            console.log('Found user:', user);

            if (!user) {
                console.log('User not found in database');
                res.status(401);
                throw new Error('User not found');
            }

            req.user = user;
            next();

        } catch (error) {
            console.error('Error in auth middleware:', error);
            res.status(401);
            throw new Error('Not authorized: ' + error.message);
        }
    } else {
        res.status(401);
        throw new Error('Not authorized, no token provided');
    }
});

module.exports = { protect };