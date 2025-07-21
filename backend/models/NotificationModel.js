const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    Notification_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'message', 
            'group_invite', 
            'group_join', 
            'group_leave', 
            'file_share',
            'system'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chatrooms',
        default: null
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GroupChat',
        default: null
    },
    message_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
        default: null
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index สำหรับการค้นหา
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

// Method สำหรับทำเครื่องหมายอ่านแล้ว
notificationSchema.methods.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};

// Static method สำหรับสร้าง notification
notificationSchema.statics.createNotification = async function(data) {
    const notification = new this(data);
    return await notification.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
