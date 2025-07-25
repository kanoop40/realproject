const mongoose = require('mongoose');

const privateChatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
        default: null
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isDeleted: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    readStatus: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastReadAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Index สำหรับค้นหาแชทระหว่าง 2 คน
privateChatSchema.index({ participants: 1 });

module.exports = mongoose.model('PrivateChat', privateChatSchema);
