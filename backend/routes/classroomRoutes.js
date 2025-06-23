const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// TODO: เพิ่ม controller functions เมื่อสร้างเสร็จ
const { 
  createClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom,
  addStudents,
  removeStudents
} = require('../controllers/classroomController');

// Routes
router.route('/')
  .post(protect, checkRole('teacher', 'admin'), createClassroom)
  .get(protect, getClassrooms);

router.route('/:id')
  .put(protect, checkRole('teacher', 'admin'), updateClassroom)
  .delete(protect, checkRole('teacher', 'admin'), deleteClassroom);

router.route('/:id/students')
  .post(protect, checkRole('teacher', 'admin'), addStudents)
  .delete(protect, checkRole('teacher', 'admin'), removeStudents);

module.exports = router;