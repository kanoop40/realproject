const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        faculty: { type: String },
        major: { type: String },
        groupCode: { type: String },
        avatar: {
            type: String,
            default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
        },
        role: {
            type: String,
            required: true,
            enum: ['student', 'teacher', 'staff', 'admin'], // กำหนดค่าที่เป็นไปได้
            default: 'student',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true, // สร้าง field createdAt และ updatedAt อัตโนมัติ
    }
);

// --- ฟังก์ชันสำหรับเข้ารหัสรหัสผ่านก่อนบันทึก ---
userSchema.pre('save', async function (next) {
    // เข้ารหัสเฉพาะเมื่อมีการแก้ไขรหัสผ่านเท่านั้น
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10); // สร้าง "เกลือ" สำหรับเพิ่มความปลอดภัย
    this.password = await bcrypt.hash(this.password, salt); // ทำการ hash รหัสผ่าน
});

// --- ฟังก์ชันสำหรับเปรียบเทียบรหัสผ่าน ---
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


const User = mongoose.model("User", userSchema);

module.exports = User;