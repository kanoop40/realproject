const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d", // Token จะหมดอายุใน 30 วัน
    });
};

module.exports = generateToken;