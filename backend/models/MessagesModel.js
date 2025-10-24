const mongoose = require('mongoose');

const messagesSchema = new mongoose.Schema({
    Messages_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chatrooms',
        required: true
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GroupChat',
        default: null
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'image', 'system'],
        default: 'text'
    },
    time: {
        type: Date,
        default: Date.now
    },
    file_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null
    },
    // เพิ่ม fields สำหรับเก็บข้อมูลไฟล์โดยตรง (Cloudinary)
    fileUrl: {
        type: String,
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    fileSize: {
        type: Number,
        default: null
    },
    mimeType: {
        type: String,
        default: null
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDeleted: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    editedAt: {
        type: Date,
        default: null
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  
        default: null
    }
}, {
    timestamps: true
});

// Index สำหรับการค้นหา
messagesSchema.index({ chat_id: 1, time: -1 });
messagesSchema.index({ group_id: 1, time: -1 });
messagesSchema.index({ user_id: 1 });

// Method สำหรับทำเครื่องหมายว่าอ่านแล้ว
messagesSchema.methods.markAsRead = function(userId) {
    const existingRead = this.readBy.find(read => 
        read.user.toString() === userId.toString()
    );
    
    if (!existingRead) {
        this.readBy.push({
            user: userId,
            readAt: new Date()
        });
        return this.save();
    }
    
    return Promise.resolve(this);
};

// Method สำหรับตรวจสอบว่าอ่านแล้วหรือไม่
messagesSchema.methods.isReadBy = function(userId) {
    return this.readBy.some(read => 
        read.user.toString() === userId.toString()
    );
};

// Virtual getter สำหรับ timestamp (เพื่อ compatibility กับ frontend)
messagesSchema.virtual('timestamp').get(function() {
    return this.time;
});

// ให้แน่ใจว่า virtuals ถูก include ใน JSON
messagesSchema.set('toJSON', { virtuals: true });
messagesSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Messages', messagesSchema);
