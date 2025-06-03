const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ msg: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};