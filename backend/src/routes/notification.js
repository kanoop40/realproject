const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');

router.get('/', auth, notificationController.getUserNotifications);
router.put('/:notificationId/read', auth, notificationController.markAsRead);

module.exports = router;