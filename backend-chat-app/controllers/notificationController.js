const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
};

exports.markAsRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ msg: 'Marked as read' });
};

exports.deleteNotification = async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ msg: 'Notification deleted' });
};