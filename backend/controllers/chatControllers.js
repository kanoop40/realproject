const asyncHandler = require('express-async-handler');
const { Chat } = require('../models/ChatModel');
const { Message } = require('../models/MessageModel');

// @desc    Access or Create Chat
// @route   POST /api/chat
// @access  Private
const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400);
        throw new Error("UserId param not sent with request");
    }

    let chat = await Chat.findOne({
        isGroupChat: false,
        $and: [
            { user_id: { $elemMatch: { $eq: req.user.user_id } } },
            { user_id: { $elemMatch: { $eq: userId } } },
        ],
    }).populate("user_id", "-password");

    if (chat) {
        res.json(chat);
    } else {
        const chatData = {
            roomName: "sender",
            isGroupChat: false,
            user_id: [req.user.user_id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "user_id",
                "-password"
            );
            res.status(200).json(fullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
});

// @desc    Create Group Chat
// @route   POST /api/chat/group
// @access  Private
const createGroupChat = asyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.roomName) {
        res.status(400);
        throw new Error("Please fill all the fields");
    }

    let users = req.body.users;
    users.push(req.user.user_id);

    try {
        const groupChat = await Chat.create({
            roomName: req.body.roomName,
            user_id: users,
            isGroupChat: true,
            groupAvatar: req.body.groupAvatar || "default-group-avatar.png"
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("user_id", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Send Message
// @route   POST /api/chat/message
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { content, chat_id } = req.body;

    if (!content || !chat_id) {
        res.status(400);
        throw new Error("Invalid data passed into request");
    }

    const newMessage = {
        user_id: req.user.user_id,
        content: content,
        chat_id: chat_id,
        time: new Date()
    };

    try {
        let message = await Message.create(newMessage);

        message = await Message.findOne({ _id: message._id })
            .populate("user_id", "username firstName lastName avatar");

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Get all Messages
// @route   GET /api/chat/messages/:chatId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({ chat_id: req.params.chatId })
            .populate("user_id", "username firstName lastName avatar")
            .sort({ time: 1 });

        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Delete Message
// @route   DELETE /api/chat/message/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        // Check if user is authorized to delete the message
        if (message.user_id.toString() !== req.user.user_id.toString()) {
            res.status(401);
            throw new Error("Not authorized to delete this message");
        }

        await message.remove();

        res.json({ message: "Message deleted successfully" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

module.exports = {
    accessChat,
    createGroupChat,
    sendMessage,
    getMessages,
    deleteMessage
};