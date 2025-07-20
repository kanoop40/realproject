const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    Notification_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    Messages: {
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
        required: true
    },
    Messages_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
