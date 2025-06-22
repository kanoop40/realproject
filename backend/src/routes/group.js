const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/create', 
  auth, 
  upload.single('groupAvatar'), 
  groupController.createGroup
);
router.post('/:groupId/members', auth, groupController.addMembers);
router.delete('/:groupId/members', auth, groupController.removeMembers);
router.post('/:groupId/leave', auth, groupController.leaveGroup);

module.exports = router;