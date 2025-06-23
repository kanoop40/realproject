const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
    {
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
    }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = { Message };