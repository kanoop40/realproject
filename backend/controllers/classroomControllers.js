const asyncHandler = require('express-async-handler');
const Classroom = require('../models/ClassroomModel');

// @desc    Create new classroom
// @route   POST /api/classrooms
// @access  Private/Teacher/Admin
const createClassroom = asyncHandler(async (req, res) => {
  const { roomName, groupAvatar } = req.body;

  const classroom = await Classroom.create({
    roomName,
    user_id: [req.user._id],
    groupAvatar
  });

  res.status(201).json(classroom);
});

// @desc    Get all classrooms
// @route   GET /api/classrooms
// @access  Private
const getClassrooms = asyncHandler(async (req, res) => {
  const classrooms = await Classroom.find({
    user_id: req.user._id
  });

  res.json(classrooms);
});

// @desc    Update classroom
// @route   PUT /api/classrooms/:id
// @access  Private/Teacher/Admin
const updateClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);

  if (!classroom) {
    res.status(404);
    throw new Error('Classroom not found');
  }

  const updatedClassroom = await Classroom.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(updatedClassroom);
});

// @desc    Delete classroom
// @route   DELETE /api/classrooms/:id
// @access  Private/Teacher/Admin
const deleteClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);

  if (!classroom) {
    res.status(404);
    throw new Error('Classroom not found');
  }

  await classroom.remove();

  res.json({ message: 'Classroom removed' });
});

// @desc    Add students to classroom
// @route   POST /api/classrooms/:id/students
// @access  Private/Teacher/Admin
const addStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  
  const classroom = await Classroom.findById(req.params.id);
  
  if (!classroom) {
    res.status(404);
    throw new Error('Classroom not found');
  }

  classroom.user_id.push(...studentIds);
  await classroom.save();

  res.json(classroom);
});

// @desc    Remove students from classroom
// @route   DELETE /api/classrooms/:id/students
// @access  Private/Teacher/Admin
const removeStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  
  const classroom = await Classroom.findById(req.params.id);
  
  if (!classroom) {
    res.status(404);
    throw new Error('Classroom not found');
  }

  classroom.user_id = classroom.user_id.filter(
    id => !studentIds.includes(id.toString())
  );
  await classroom.save();

  res.json(classroom);
});

module.exports = {
  createClassroom,
  getClassrooms,
  updateClassroom,
  deleteClassroom,
  addStudents,
  removeStudents
};