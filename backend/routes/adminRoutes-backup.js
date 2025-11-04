const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { checkRole } = require('../Middleware/roleMiddleware');

// ข้อมูลเริ่มต้น - จะถูกแทนที่ด้วยการโหลดจากไฟล์หรือฐานข้อมูล
let systemData = {
  departments: [
    { id: '1', name: 'งานการเงิน', createdAt: new Date() },
    { id: '2', name: 'งานบุคลากร', createdAt: new Date() },
    { id: '3', name: 'งานทะเบียน', createdAt: new Date() },
    { id: '4', name: 'กองทุนเงินกู้ กยศ', createdAt: new Date() }
  ],
  faculties: [
    { id: '1', name: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
  ],
  majors: {
    '1': [
      { id: '1', name: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '2', name: '346 การบัญชี', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '3', name: '347 การจัดการ', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '4', name: '348 การตลาด', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
    ]
  },
  groupCodes: {
    '1': [ // DT
      { id: '1', name: 'DT26721N', majorId: '1', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '2', name: 'DT26722N', majorId: '1', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '3', name: 'DT26723N', majorId: '1', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
    ],
    '2': [ // ACC
      { id: '4', name: 'ACC26701', majorId: '2', majorName: '346 การบัญชี', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '5', name: 'ACC26702', majorId: '2', majorName: '346 การบัญชี', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
    ],
    '3': [ // MGT
      { id: '6', name: 'MGT26701', majorId: '3', majorName: '347 การจัดการ', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '7', name: 'MGT26702', majorId: '3', majorName: '347 การจัดการ', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
    ],
    '4': [ // MKT - การตลาด
      { id: '8', name: 'MKT26701', majorId: '4', majorName: '348 การตลาด', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
      { id: '9', name: 'MKT26702', majorId: '4', majorName: '348 การตลาด', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
    ]
  }
};

// Helper function to generate ID
const generateId = () => Date.now().toString();

// Helper function to find next available ID
const getNextId = (array) => {
  const maxId = array.reduce((max, item) => {
    const id = parseInt(item.id);
    return id > max ? id : max;
  }, 0);
  return (maxId + 1).toString();
};

// GET /api/admin/departments - รับรายการหน่วยงาน
router.get('/departments', protect, checkRole('admin'), (req, res) => {
  try {
    console.log('📁 Getting departments list');
    res.status(200).json({
      success: true,
      data: systemData.departments
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
router.post('/departments', protect, checkRole('admin'), (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อหน่วยงาน'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม
    const existingDept = systemData.departments.find(d => d.name.toLowerCase() === name.trim().toLowerCase());
    if (existingDept) {
      return res.status(409).json({
        success: false,
        message: 'หน่วยงานนี้มีในระบบแล้ว'
      });
    }

    const newDepartment = {
      id: getNextId(systemData.departments),
      name: name.trim(),
      createdAt: new Date()
    };

    systemData.departments.push(newDepartment);

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
      message: 'ไม่สามารถเพิ่มหน่วยงานได้'
    });
  }
});

// PUT /api/admin/departments/:id - แก้ไขหน่วยงาน
router.put('/departments/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อหน่วยงาน'
      });
    }

    const deptIndex = systemData.departments.findIndex(d => d.id === id);
    if (deptIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหน่วยงานที่ต้องการแก้ไข'
      });
    }

    // ตรวจสอบชื่อซ้ำ (ยกเว้นรายการที่กำลังแก้ไข)
    const existingDept = systemData.departments.find(d => 
      d.id !== id && d.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingDept) {
      return res.status(409).json({
        success: false,
        message: 'หน่วยงานนี้มีในระบบแล้ว'
      });
    }

    systemData.departments[deptIndex].name = name.trim();
    systemData.departments[deptIndex].updatedAt = new Date();

    console.log('✅ Department updated:', systemData.departments[deptIndex].name);
    res.status(200).json({
      success: true,
      data: systemData.departments[deptIndex],
      message: 'อัปเดตหน่วยงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตหน่วยงานได้'
    });
  }
});

// DELETE /api/admin/departments/:id - ลบหน่วยงาน
router.delete('/departments/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    
    const deptIndex = systemData.departments.findIndex(d => d.id === id);
    if (deptIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหน่วยงานที่ต้องการลบ'
      });
    }

    const deletedDept = systemData.departments[deptIndex];
    systemData.departments.splice(deptIndex, 1);

    console.log('✅ Department deleted:', deletedDept.name);
    res.status(200).json({
      success: true,
      message: 'ลบหน่วยงานเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบหน่วยงานได้'
    });
  }
});

// GET /api/admin/faculties - รับรายการคณะ
router.get('/faculties', protect, checkRole('admin'), (req, res) => {
  try {
    console.log('📁 Getting faculties list');
    res.status(200).json({
      success: true,
      data: systemData.faculties
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
router.post('/faculties', protect, checkRole('admin'), (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อคณะ'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำไหม
    const existingFac = systemData.faculties.find(f => f.name.toLowerCase() === name.trim().toLowerCase());
    if (existingFac) {
      return res.status(409).json({
        success: false,
        message: 'คณะนี้มีในระบบแล้ว'
      });
    }

    const newFaculty = {
      id: getNextId(systemData.faculties),
      name: name.trim(),
      createdAt: new Date()
    };

    systemData.faculties.push(newFaculty);

    // เพิ่ม key ใหม่ใน majors object
    systemData.majors[newFaculty.id] = [];
    
    console.log('✅ New faculty created:', newFaculty.name);
    res.status(201).json({
      success: true,
      data: newFaculty,
      message: 'เพิ่มคณะเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเพิ่มคณะได้'
    });
  }
});

// PUT /api/admin/faculties/:id - แก้ไขคณะ
router.put('/faculties/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อคณะ'
      });
    }

    const facIndex = systemData.faculties.findIndex(f => f.id === id);
    if (facIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคณะที่ต้องการแก้ไข'
      });
    }

    // ตรวจสอบชื่อซ้ำ
    const existingFac = systemData.faculties.find(f => 
      f.id !== id && f.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingFac) {
      return res.status(409).json({
        success: false,
        message: 'คณะนี้มีในระบบแล้ว'
      });
    }

    systemData.faculties[facIndex].name = name.trim();
    systemData.faculties[facIndex].updatedAt = new Date();

    // อัปเดตข้อมูลในสาขาที่เชื่อมโยง
    if (systemData.majors[id]) {
      systemData.majors[id].forEach(major => {
        major.facultyName = name.trim();
      });
    }

    console.log('✅ Faculty updated:', systemData.faculties[facIndex].name);
    res.status(200).json({
      success: true,
      data: systemData.faculties[facIndex],
      message: 'อัปเดตคณะเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตคณะได้'
    });
  }
});

// DELETE /api/admin/faculties/:id - ลบคณะ
router.delete('/faculties/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    
    const facIndex = systemData.faculties.findIndex(f => f.id === id);
    if (facIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคณะที่ต้องการลบ'
      });
    }

    const deletedFac = systemData.faculties[facIndex];
    
    // ลบสาขาที่เชื่อมโยงทั้งหมด
    if (systemData.majors[id]) {
      // ลบกลุ่มเรียนที่เชื่อมโยงกับสาขาที่จะลบ
      systemData.majors[id].forEach(major => {
        delete systemData.groupCodes[major.id];
      });
      delete systemData.majors[id];
    }
    
    systemData.faculties.splice(facIndex, 1);

    console.log('✅ Faculty deleted:', deletedFac.name);
    res.status(200).json({
      success: true,
      message: 'ลบคณะและข้อมูลที่เชื่อมโยงเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบคณะได้'
    });
  }
});

// GET /api/admin/majors - รับรายการสาขา
router.get('/majors', protect, checkRole('admin'), (req, res) => {
  try {
    console.log('📁 Getting majors list');
    res.status(200).json({
      success: true,
      data: systemData.majors
    });
  } catch (error) {
    console.error('Error getting majors:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดข้อมูลสาขาได้'
    });
  }
});

// POST /api/admin/majors - เพิ่มสาขาใหม่
router.post('/majors', protect, checkRole('admin'), (req, res) => {
  try {
    const { name, facultyId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อสาขา'
      });
    }

    if (!facultyId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกคณะ'
      });
    }

    // หาคณะที่เลือก
    const faculty = systemData.faculties.find(f => f.id === facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคณะที่เลือก'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำในคณะเดียวกันไหม
    if (!systemData.majors[facultyId]) {
      systemData.majors[facultyId] = [];
    }

    const existingMajor = systemData.majors[facultyId].find(m => 
      m.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingMajor) {
      return res.status(409).json({
        success: false,
        message: 'สาขานี้มีในคณะนี้แล้ว'
      });
    }

    // หา ID ที่ใหญ่ที่สุดใน majors ทั้งหมด
    const allMajors = Object.values(systemData.majors).flat();
    const newMajor = {
      id: getNextId(allMajors),
      name: name.trim(),
      facultyId,
      facultyName: faculty.name,
      createdAt: new Date()
    };

    systemData.majors[facultyId].push(newMajor);
    
    // เพิ่ม key ใหม่ใน groupCodes object
    systemData.groupCodes[newMajor.id] = [];

    console.log('✅ New major created:', newMajor.name);
    res.status(201).json({
      success: true,
      data: newMajor,
      message: 'เพิ่มสาขาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating major:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเพิ่มสาขาได้'
    });
  }
});

// PUT /api/admin/majors/:id - แก้ไขสาขา
router.put('/majors/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อสาขา'
      });
    }

    // หาสาขาที่ต้องการแก้ไข
    let majorToUpdate = null;
    let facultyId = null;
    
    for (const [fId, majors] of Object.entries(systemData.majors)) {
      const major = majors.find(m => m.id === id);
      if (major) {
        majorToUpdate = major;
        facultyId = fId;
        break;
      }
    }

    if (!majorToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสาขาที่ต้องการแก้ไข'
      });
    }

    // ตรวจสอบชื่อซ้ำในคณะเดียวกัน
    const existingMajor = systemData.majors[facultyId].find(m => 
      m.id !== id && m.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingMajor) {
      return res.status(409).json({
        success: false,
        message: 'สาขานี้มีในคณะนี้แล้ว'
      });
    }

    majorToUpdate.name = name.trim();
    majorToUpdate.updatedAt = new Date();

    // อัปเดตข้อมูลในกลุ่มเรียนที่เชื่อมโยง
    if (systemData.groupCodes[id]) {
      systemData.groupCodes[id].forEach(group => {
        group.majorName = name.trim();
      });
    }

    console.log('✅ Major updated:', majorToUpdate.name);
    res.status(200).json({
      success: true,
      data: majorToUpdate,
      message: 'อัปเดตสาขาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating major:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตสาขาได้'
    });
  }
});

// DELETE /api/admin/majors/:id - ลบสาขา
router.delete('/majors/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    
    // หาและลบสาขา
    let deleted = false;
    let deletedMajor = null;
    
    for (const [facultyId, majors] of Object.entries(systemData.majors)) {
      const majorIndex = majors.findIndex(m => m.id === id);
      if (majorIndex !== -1) {
        deletedMajor = majors[majorIndex];
        majors.splice(majorIndex, 1);
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสาขาที่ต้องการลบ'
      });
    }

    // ลบกลุ่มเรียนที่เชื่อมโยง
    delete systemData.groupCodes[id];

    console.log('✅ Major deleted:', deletedMajor.name);
    res.status(200).json({
      success: true,
      message: 'ลบสาขาและข้อมูลที่เชื่อมโยงเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting major:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบสาขาได้'
    });
  }
});

// GET /api/admin/group-codes - รับรายการกลุ่มเรียน
router.get('/group-codes', protect, checkRole('admin'), (req, res) => {
  try {
    console.log('📁 Getting group codes list');
    res.status(200).json({
      success: true,
      data: systemData.groupCodes
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
router.post('/group-codes', protect, checkRole('admin'), (req, res) => {
  try {
    const { name, majorId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสกลุ่มเรียน'
      });
    }

    if (!majorId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกสาขา'
      });
    }

    // หาสาขาที่เลือก
    let selectedMajor = null;
    let facultyInfo = null;
    
    for (const [fId, majors] of Object.entries(systemData.majors)) {
      const major = majors.find(m => m.id === majorId);
      if (major) {
        selectedMajor = major;
        facultyInfo = systemData.faculties.find(f => f.id === fId);
        break;
      }
    }

    if (!selectedMajor) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสาขาที่เลือก'
      });
    }

    // ตรวจสอบว่ามีชื่อซ้ำในสาขาเดียวกันไหม
    if (!systemData.groupCodes[majorId]) {
      systemData.groupCodes[majorId] = [];
    }

    const existingGroup = systemData.groupCodes[majorId].find(g => 
      g.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingGroup) {
      return res.status(409).json({
        success: false,
        message: 'กลุ่มเรียนนี้มีในสาขานี้แล้ว'
      });
    }

    // หา ID ที่ใหญ่ที่สุดใน group codes ทั้งหมด
    const allGroups = Object.values(systemData.groupCodes).flat();
    const newGroup = {
      id: getNextId(allGroups),
      name: name.trim(),
      majorId,
      majorName: selectedMajor.name,
      facultyId: selectedMajor.facultyId,
      facultyName: facultyInfo ? facultyInfo.name : selectedMajor.facultyName,
      createdAt: new Date()
    };

    systemData.groupCodes[majorId].push(newGroup);

    console.log('✅ New group code created:', newGroup.name);
    res.status(201).json({
      success: true,
      data: newGroup,
      message: 'เพิ่มกลุ่มเรียนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error creating group code:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเพิ่มกลุ่มเรียนได้'
    });
  }
});

// PUT /api/admin/group-codes/:id - แก้ไขกลุ่มเรียน
router.put('/group-codes/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสกลุ่มเรียน'
      });
    }

    // หากลุ่มเรียนที่ต้องการแก้ไข
    let groupToUpdate = null;
    let majorId = null;
    
    for (const [mId, groups] of Object.entries(systemData.groupCodes)) {
      const group = groups.find(g => g.id === id);
      if (group) {
        groupToUpdate = group;
        majorId = mId;
        break;
      }
    }

    if (!groupToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกลุ่มเรียนที่ต้องการแก้ไข'
      });
    }

    // ตรวจสอบชื่อซ้ำในสาขาเดียวกัน
    const existingGroup = systemData.groupCodes[majorId].find(g => 
      g.id !== id && g.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingGroup) {
      return res.status(409).json({
        success: false,
        message: 'กลุ่มเรียนนี้มีในสาขานี้แล้ว'
      });
    }

    groupToUpdate.name = name.trim();
    groupToUpdate.updatedAt = new Date();

    console.log('✅ Group code updated:', groupToUpdate.name);
    res.status(200).json({
      success: true,
      data: groupToUpdate,
      message: 'อัปเดตกลุ่มเรียนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error updating group code:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตกลุ่มเรียนได้'
    });
  }
});

// DELETE /api/admin/group-codes/:id - ลบกลุ่มเรียน
router.delete('/group-codes/:id', protect, checkRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    
    // หาและลบกลุ่มเรียน
    let deleted = false;
    let deletedGroup = null;
    
    for (const [majorId, groups] of Object.entries(systemData.groupCodes)) {
      const groupIndex = groups.findIndex(g => g.id === id);
      if (groupIndex !== -1) {
        deletedGroup = groups[groupIndex];
        groups.splice(groupIndex, 1);
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกลุ่มเรียนที่ต้องการลบ'
      });
    }

    console.log('✅ Group code deleted:', deletedGroup.name);
    res.status(200).json({
      success: true,
      message: 'ลบกลุ่มเรียนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting group code:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบกลุ่มเรียนได้'
    });
  }
});

module.exports = router;
