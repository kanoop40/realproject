const Log = require('../models/Log');

exports.getAllLogs = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Permission denied' });
  const logs = await Log.find().populate('user').sort({ createdAt: -1 });
  res.json(logs);
};

exports.addLog = async (req, res) => {
  const { action, detail } = req.body;
  const log = await Log.create({
    user: req.user.id,
    action,
    detail
  });
  res.json(log);
};