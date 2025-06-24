const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }

    console.log('Generating token for ID:', id);
    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
    console.log('Generated token:', token); // เพิ่ม log

    // ทดสอบ verify token ทันทีหลังสร้าง
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified successfully:', decoded);
    } catch (error) {
        console.error('Token verification failed:', error);
    }

    return token;
};

module.exports = generateToken;