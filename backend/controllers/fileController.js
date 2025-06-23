const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const File = require('../models/FileModel');
const fs = require('fs').promises;
const crypto = require('crypto');

// กำหนดการจัดเก็บไฟล์
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// ตรวจสอบประเภทไฟล์
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4',
        'audio/mpeg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต'), false);
    }
};

// กำหนดค่า multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // จำกัดขนาด 10MB
    }
}).single('file'); // ชื่อฟิลด์ที่จะรับไฟล์

// @desc    อัพโหลดไฟล์
// @route   POST /api/files/upload
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            res.status(400);
            throw new Error(`อัพโหลดผิดพลาด: ${err.message}`);
        } else if (err) {
            res.status(400);
            throw new Error(err.message);
        }

        if (!req.file) {
            res.status(400);
            throw new Error('ไม่พบไฟล์ที่อัพโหลด');
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const file = await File.create({
            file_name: req.file.originalname,
            url: `${baseUrl}/uploads/${req.file.filename}`,
            user_id: req.user.user_id,
            Messages_id: req.body.Messages_id,
            chat_id: req.body.chat_id,
            size: req.file.size.toString(),
            file_type: req.file.mimetype
        });

        res.status(201).json(file);
    });
});

// @desc    ดาวน์โหลดไฟล์
// @route   GET /api/files/:fileId
// @access  Private
const downloadFile = asyncHandler(async (req, res) => {
    const file = await File.findOne({ 
        file_id: req.params.fileId,
        chat_id: { $in: req.user.chats }  // ตรวจสอบว่าผู้ใช้อยู่ในแชทที่มีไฟล์นี้
    });

    if (!file) {
        res.status(404);
        throw new Error('ไม่พบไฟล์หรือคุณไม่มีสิทธิ์เข้าถึง');
    }

    const filePath = path.join(__dirname, '..', 'uploads', path.basename(file.url));
    res.download(filePath, file.file_name);
});

// @desc    ลบไฟล์
// @route   DELETE /api/files/:fileId
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
    const file = await File.findOne({ 
        file_id: req.params.fileId,
        user_id: req.user.user_id  // ตรวจสอบว่าเป็นผู้อัพโหลดไฟล์
    });

    if (!file) {
        res.status(404);
        throw new Error('ไม่พบไฟล์หรือคุณไม่มีสิทธิ์ลบ');
    }

    // ลบไฟล์จากระบบ
    try {
        const filePath = path.join(__dirname, '..', 'uploads', path.basename(file.url));
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error deleting file:', error);
    }

    await File.deleteOne({ file_id: req.params.fileId });

    res.json({ message: 'ลบไฟล์เรียบร้อยแล้ว' });
});

// @desc    ดึงข้อมูลไฟล์
// @route   GET /api/files/info/:fileId
// @access  Private
const getFileInfo = asyncHandler(async (req, res) => {
    const file = await File.findOne({ 
        file_id: req.params.fileId,
        chat_id: { $in: req.user.chats }
    });

    if (!file) {
        res.status(404);
        throw new Error('ไม่พบไฟล์หรือคุณไม่มีสิทธิ์เข้าถึง');
    }

    res.json(file);
});

module.exports = {
    uploadFile,
    downloadFile,
    deleteFile,
    getFileInfo
};