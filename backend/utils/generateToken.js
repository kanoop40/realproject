const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    try {
        const token = jwt.sign(
            { id: id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        return token;
    } catch (error) {
        console.error('Error generating token:', error);
        throw error;
    }
};

module.exports = generateToken;