const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      username: user.username,
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      faculty: user.faculty || "",
      major: user.major || "",
      groupCode: user.groupCode || "",
      avatar: user.avatar || "",
      role: user.role || "", // <-- เพิ่ม
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /user/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      username: user.username,
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      faculty: user.faculty || "",
      major: user.major || "",
      groupCode: user.groupCode || "",
      avatar: user.avatar || "",
      role: user.role || "", // <-- เพิ่ม
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;