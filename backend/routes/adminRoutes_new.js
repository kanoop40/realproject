const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { checkRole } = require('../Middleware/roleMiddleware');

// Import models
const Department = require('../models/DepartmentModel');
const Faculty = require('../models/FacultyModel');
const Major = require('../models/MajorModel');
const GroupCode = require('../models/GroupCodeModel');

// ===========================================
// DEPARTMENTS ROUTES
// ===========================================

// GET /api/admin/departments - รับรายการหน่วยงาน
router.get('/departments', protect, checkRole('admin'), async (req, res) => {
  try {
    console.log('📁 Getting departments list from database');
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดข้อมูลหน่วยงานได้'
    });
  }
});

// POST /api/admin/departments - เพิ่มหน่วยงานใหม่
router.post('/departments', protect, checkRole('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อหน่วยงาน'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม
    const existingDept = await Department.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') } 
    });
    
    if (existingDept) {
      return res.status(409).json({
        success: false,
        message: 'หน่วยงานนี้มีในระบบแล้ว'
      });
    }

    const newDepartment = new Department({
      name: name.trim(),
      description: description?.trim(),
      createdBy: req.user.id
    });

    await newDepartment.save();

    console.log('✅ New department created:', newDepartment.name);
    res.status(201).json({
      success: true,
      data: newDepartment,
      message: 'เพิ่มหน่วยงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างหน่วยงาน'
    });
  }
});

// PUT /api/admin/departments/:id - แก้ไขหน่วยงาน
router.put('/departments/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อหน่วยงาน'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม (ยกเว้นรายการที่กำลังแก้ไข)
    const existingDept = await Department.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
      _id: { $ne: id }
    });
    
    if (existingDept) {
      return res.status(409).json({
        success: false,
        message: 'หน่วยงานนี้มีในระบบแล้ว'
      });
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      { 
        name: name.trim(),
        description: description?.trim(),
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedDepartment) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหน่วยงานที่ต้องการแก้ไข'
      });
    }

    res.json({
      success: true,
      data: updatedDepartment,
      message: 'แก้ไขหน่วยงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขหน่วยงาน'
    });
  }
});

// DELETE /api/admin/departments/:id - ลบหน่วยงาน
router.delete('/departments/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหน่วยงานที่ต้องการลบ'
      });
    }

    res.json({
      success: true,
      message: 'ลบหน่วยงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบหน่วยงาน'
    });
  }
});

// ===========================================
// FACULTIES ROUTES
// ===========================================

// GET /api/admin/faculties - รับรายการคณะ
router.get('/faculties', protect, checkRole('admin'), async (req, res) => {
  try {
    const faculties = await Faculty.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: faculties
    });
  } catch (error) {
    console.error('Error getting faculties:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดข้อมูลคณะได้'
    });
  }
});

// POST /api/admin/faculties - เพิ่มคณะใหม่
router.post('/faculties', protect, checkRole('admin'), async (req, res) => {
  try {
    const { name, shortName, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อคณะ'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม
    const existingFaculty = await Faculty.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') } 
    });
    
    if (existingFaculty) {
      return res.status(409).json({
        success: false,
        message: 'คณะนี้มีในระบบแล้ว'
      });
    }

    const newFaculty = new Faculty({
      name: name.trim(),
      shortName: shortName?.trim(),
      description: description?.trim(),
      createdBy: req.user.id
    });

    await newFaculty.save();

    res.status(201).json({
      success: true,
      data: newFaculty,
      message: 'เพิ่มคณะเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างคณะ'
    });
  }
});

// PUT /api/admin/faculties/:id - แก้ไขคณะ
router.put('/faculties/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortName, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อคณะ'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม (ยกเว้นรายการที่กำลังแก้ไข)
    const existingFaculty = await Faculty.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
      _id: { $ne: id }
    });
    
    if (existingFaculty) {
      return res.status(409).json({
        success: false,
        message: 'คณะนี้มีในระบบแล้ว'
      });
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      id,
      { 
        name: name.trim(),
        shortName: shortName?.trim(),
        description: description?.trim(),
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedFaculty) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคณะที่ต้องการแก้ไข'
      });
    }

    // อัปเดตข้อมูลที่เกี่ยวข้อง
    await Major.updateMany(
      { facultyId: id },
      { facultyName: name.trim(), updatedAt: Date.now() }
    );

    await GroupCode.updateMany(
      { facultyId: id },
      { facultyName: name.trim(), updatedAt: Date.now() }
    );

    res.json({
      success: true,
      data: updatedFaculty,
      message: 'แก้ไขคณะเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขคณะ'
    });
  }
});

// DELETE /api/admin/faculties/:id - ลบคณะ
router.delete('/faculties/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่ามีสาขาที่ใช้งานคณะนี้อยู่หรือไม่
    const majorsCount = await Major.countDocuments({ facultyId: id, isActive: true });
    if (majorsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถลบคณะได้ เนื่องจากมีสาขาวิชา ${majorsCount} สาขาที่ใช้งานคณะนี้อยู่`
      });
    }

    const faculty = await Faculty.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคณะที่ต้องการลบ'
      });
    }

    res.json({
      success: true,
      message: 'ลบคณะเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบคณะ'
    });
  }
});

// ===========================================
// MAJORS ROUTES
// ===========================================

// GET /api/admin/majors - รับรายการสาขาวิชา
router.get('/majors', protect, checkRole('admin'), async (req, res) => {
  try {
    const { facultyId } = req.query;
    let query = { isActive: true };
    
    if (facultyId) {
      query.facultyId = facultyId;
    }

    const majors = await Major.find(query)
      .populate('facultyId', 'name shortName')
      .sort({ facultyName: 1, name: 1 });
      
    res.status(200).json({
      success: true,
      data: majors
    });
  } catch (error) {
    console.error('Error getting majors:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดข้อมูลสาขาวิชาได้'
    });
  }
});

// POST /api/admin/majors - เพิ่มสาขาวิชาใหม่
router.post('/majors', protect, checkRole('admin'), async (req, res) => {
  try {
    const { name, code, facultyId, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อสาขาวิชา'
      });
    }

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกคณะ'
      });
    }

    // ตรวจสอบว่าคณะมีอยู่จริง
    const faculty = await Faculty.findById(facultyId);
    if (!faculty || !faculty.isActive) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบคณะที่เลือก'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำในคณะเดียวกันไหม
    const existingMajor = await Major.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
      facultyId: facultyId
    });
    
    if (existingMajor) {
      return res.status(409).json({
        success: false,
        message: 'สาขาวิชานี้มีในคณะนี้แล้ว'
      });
    }

    const newMajor = new Major({
      name: name.trim(),
      code: code?.trim(),
      facultyId: facultyId,
      facultyName: faculty.name,
      description: description?.trim(),
      createdBy: req.user.id
    });

    await newMajor.save();

    res.status(201).json({
      success: true,
      data: newMajor,
      message: 'เพิ่มสาขาวิชาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating major:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างสาขาวิชา'
    });
  }
});

// PUT /api/admin/majors/:id - แก้ไขสาขาวิชา
router.put('/majors/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, facultyId, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อสาขาวิชา'
      });
    }

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกคณะ'
      });
    }

    // ตรวจสอบว่าคณะมีอยู่จริง
    const faculty = await Faculty.findById(facultyId);
    if (!faculty || !faculty.isActive) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบคณะที่เลือก'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำในคณะเดียวกันไหม (ยกเว้นรายการที่กำลังแก้ไข)
    const existingMajor = await Major.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
      facultyId: facultyId,
      _id: { $ne: id }
    });
    
    if (existingMajor) {
      return res.status(409).json({
        success: false,
        message: 'สาขาวิชานี้มีในคณะนี้แล้ว'
      });
    }

    const updatedMajor = await Major.findByIdAndUpdate(
      id,
      { 
        name: name.trim(),
        code: code?.trim(),
        facultyId: facultyId,
        facultyName: faculty.name,
        description: description?.trim(),
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedMajor) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสาขาวิชาที่ต้องการแก้ไข'
      });
    }

    // อัปเดตข้อมูลที่เกี่ยวข้อง
    await GroupCode.updateMany(
      { majorId: id },
      { 
        majorName: name.trim(),
        facultyId: facultyId,
        facultyName: faculty.name,
        updatedAt: Date.now()
      }
    );

    res.json({
      success: true,
      data: updatedMajor,
      message: 'แก้ไขสาขาวิชาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating major:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขสาขาวิชา'
    });
  }
});

// DELETE /api/admin/majors/:id - ลบสาขาวิชา
router.delete('/majors/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่ามีกลุ่มเรียนที่ใช้งานสาขาวิชานี้อยู่หรือไม่
    const groupCodesCount = await GroupCode.countDocuments({ majorId: id, isActive: true });
    if (groupCodesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถลบสาขาวิชาได้ เนื่องจากมีกลุ่มเรียน ${groupCodesCount} กลุ่มที่ใช้งานสาขาวิชานี้อยู่`
      });
    }

    const major = await Major.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!major) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสาขาวิชาที่ต้องการลบ'
      });
    }

    res.json({
      success: true,
      message: 'ลบสาขาวิชาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting major:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบสาขาวิชา'
    });
  }
});

// ===========================================
// GROUP CODES ROUTES
// ===========================================

// GET /api/admin/group-codes - รับรายการกลุ่มเรียน
router.get('/group-codes', protect, checkRole('admin'), async (req, res) => {
  try {
    const { majorId, facultyId } = req.query;
    let query = { isActive: true };
    
    if (majorId) {
      query.majorId = majorId;
    } else if (facultyId) {
      query.facultyId = facultyId;
    }

    const groupCodes = await GroupCode.find(query)
      .populate('majorId', 'name code')
      .populate('facultyId', 'name shortName')
      .sort({ facultyName: 1, majorName: 1, name: 1 });
      
    res.status(200).json({
      success: true,
      data: groupCodes
    });
  } catch (error) {
    console.error('Error getting group codes:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดข้อมูลกลุ่มเรียนได้'
    });
  }
});

// POST /api/admin/group-codes - เพิ่มกลุ่มเรียนใหม่
router.post('/group-codes', protect, checkRole('admin'), async (req, res) => {
  try {
    const { name, majorId, year, semester, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อกลุ่มเรียน'
      });
    }

    if (!majorId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกสาขาวิชา'
      });
    }

    // ตรวจสอบว่าสาขาวิชามีอยู่จริง
    const major = await Major.findById(majorId).populate('facultyId');
    if (!major || !major.isActive) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบสาขาวิชาที่เลือก'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม
    const existingGroupCode = await GroupCode.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') }
    });
    
    if (existingGroupCode) {
      return res.status(409).json({
        success: false,
        message: 'กลุ่มเรียนนี้มีในระบบแล้ว'
      });
    }

    const newGroupCode = new GroupCode({
      name: name.trim(),
      majorId: majorId,
      majorName: major.name,
      facultyId: major.facultyId._id,
      facultyName: major.facultyId.name,
      year: year,
      semester: semester,
      description: description?.trim(),
      createdBy: req.user.id
    });

    await newGroupCode.save();

    res.status(201).json({
      success: true,
      data: newGroupCode,
      message: 'เพิ่มกลุ่มเรียนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating group code:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างกลุ่มเรียน'
    });
  }
});

// PUT /api/admin/group-codes/:id - แก้ไขกลุ่มเรียน
router.put('/group-codes/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, majorId, year, semester, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อกลุ่มเรียน'
      });
    }

    if (!majorId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกสาขาวิชา'
      });
    }

    // ตรวจสอบว่าสาขาวิชามีอยู่จริง
    const major = await Major.findById(majorId).populate('facultyId');
    if (!major || !major.isActive) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบสาขาวิชาที่เลือก'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม (ยกเว้นรายการที่กำลังแก้ไข)
    const existingGroupCode = await GroupCode.findOne({ 
      name: { $regex: new RegExp('^' + name.trim() + '$', 'i') },
      _id: { $ne: id }
    });
    
    if (existingGroupCode) {
      return res.status(409).json({
        success: false,
        message: 'กลุ่มเรียนนี้มีในระบบแล้ว'
      });
    }

    const updatedGroupCode = await GroupCode.findByIdAndUpdate(
      id,
      { 
        name: name.trim(),
        majorId: majorId,
        majorName: major.name,
        facultyId: major.facultyId._id,
        facultyName: major.facultyId.name,
        year: year,
        semester: semester,
        description: description?.trim(),
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedGroupCode) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกลุ่มเรียนที่ต้องการแก้ไข'
      });
    }

    res.json({
      success: true,
      data: updatedGroupCode,
      message: 'แก้ไขกลุ่มเรียนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating group code:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขกลุ่มเรียน'
    });
  }
});

// DELETE /api/admin/group-codes/:id - ลบกลุ่มเรียน
router.delete('/group-codes/:id', protect, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const groupCode = await GroupCode.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!groupCode) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกลุ่มเรียนที่ต้องการลบ'
      });
    }

    res.json({
      success: true,
      message: 'ลบกลุ่มเรียนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting group code:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบกลุ่มเรียน'
    });
  }
});

// ===========================================
// UTILITY ROUTES
// ===========================================

// GET /api/admin/system-data - รับข้อมูลระบบทั้งหมด
router.get('/system-data', protect, checkRole('admin'), async (req, res) => {
  try {
    const [departments, faculties, majors, groupCodes] = await Promise.all([
      Department.find({ isActive: true }).sort({ name: 1 }),
      Faculty.find({ isActive: true }).sort({ name: 1 }),
      Major.find({ isActive: true }).populate('facultyId', 'name').sort({ facultyName: 1, name: 1 }),
      GroupCode.find({ isActive: true }).populate(['majorId', 'facultyId']).sort({ facultyName: 1, majorName: 1, name: 1 })
    ]);

    res.json({
      success: true,
      data: {
        departments,
        faculties,
        majors,
        groupCodes
      }
    });
  } catch (error) {
    console.error('Error getting system data:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดข้อมูลระบบได้'
    });
  }
});

module.exports = router;