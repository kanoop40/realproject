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
    user_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    groupAvatar: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Chatrooms', chatroomsSchema);
