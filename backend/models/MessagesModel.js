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
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        default: Date.now
    },
    file_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Messages', messagesSchema);
