const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    file_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    file_name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    Messages_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
        required: true
    },
    chat_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chatrooms',
        required: true
    },
    size: {
        type: String,
        required: true
    },
    file_type: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('File', fileSchema);
