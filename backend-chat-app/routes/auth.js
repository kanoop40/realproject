const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email, firstName, lastName, faculty, major, groupCode } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      firstName,
      lastName,
      faculty,
      major,
      groupCode
    });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});
router.post('/register', async (req, res) => {
  try {
    // ...register logic...
    res.json({ user });
  } catch (err) {
    console.error('Register error:', err); // เพิ่ม log error
    res.status(400).json({ message: err.message || "Register failed" });
  }
});
module.exports = router;