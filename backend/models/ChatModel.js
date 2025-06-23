const mongoose = require('mongoose');

// โครงสร้างข้อความ
const messageSchema = mongoose.Schema({
    Messages_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        auto: true,
        primary: true
    },
    chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chatroom",
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
        ref: "File"
    }
});

// โครงสร้างห้องแชท
const chatSchema = mongoose.Schema({
    chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        auto: true,
        primary: true
    },
    roomName: {
        type: String,
        required: true
    },
    user_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    groupAvatar: {
        type: String,
        default: "default-group-avatar.png"
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

const Message = mongoose.model("Message", messageSchema);
const Chat = mongoose.model("Chatroom", chatSchema);

module.exports = { Chat, Message };