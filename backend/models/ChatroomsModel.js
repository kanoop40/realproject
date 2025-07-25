const mongoose = require('mongoose');

const chatroomsSchema = new mongoose.Schema({
    chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    roomName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    user_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    groupAvatar: {
        type: String,
        default: null
    },
    autoInvite: {
        enabled: {
            type: Boolean,
            default: false
        },
        criteria: {
            groupCode: String,
            faculty: String,
            major: String
        }
    },
    memberCount: {
        type: Number,
        default: 0
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isPrivate: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Chatrooms', chatroomsSchema);
