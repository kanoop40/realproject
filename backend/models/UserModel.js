const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    faculty: {
        type: String,
        required: true
    },
    department: { // หน่วยงาน/คณะ
        type: String,
        required: true
    },
    major: {
        type: String,
        required: false // ไม่บังคับสำหรับอาจารย์/เจ้าหน้าที่
    },
    groupCode: { // ห้องเรียน
        type: String,
        required: false
    },
    studentId: { // รหัสนักศึกษา
        type: String,
        unique: true,
        sparse: true // อนุญาตให้เป็น null สำหรับไม่ใช่นักศึกษา
    },
    employeeId: { // รหัสพนักงาน
        type: String,
        unique: true,
        sparse: true // อนุญาตให้เป็น null สำหรับนักศึกษา
    },
    avatar: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'staff', 'admin'],
        default: 'student'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;