const mongoose = require('mongoose');

const chatSchema = mongoose.Schema(
    {
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
    },
    {
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        }
    }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = { Chat };