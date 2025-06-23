const asyncHandler = require('express-async-handler');
const { Chat, Message } = require('../models/ChatModel');
const User = require('../models/UserModel');
// @desc    Create or Access Private Chat
// @route   POST /api/chat
// @access  Private
const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400);
        throw new Error("กรุณาระบุ User ID");
    }

    // ตรวจสอบว่ามีแชทส่วนตัวอยู่แล้วหรือไม่
    let chat = await Chat.findOne({
        user_id: { 
            $all: [req.user.user_id, userId],
            $size: 2 
        }
    }).populate("user_id", "-password");

    if (chat) {
        res.json(chat);
    } else {
        // สร้างแชทใหม่
        const chatData = {
            roomName: "private chat",
            user_id: [req.user.user_id, userId]
        };

        try {
            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id })
                .populate("user_id", "-password");
            res.status(201).json(fullChat);
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
    const { roomName, userIds, groupAvatar } = req.body;

    if (!roomName || !userIds) {
        res.status(400);
        throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    // รวมผู้สร้างกลุ่มเข้าไปด้วย
    const users = [...userIds, req.user.user_id];

    try {
        const groupChat = await Chat.create({
            roomName,
            user_id: users,
            groupAvatar: groupAvatar || "default-group.png"
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("user_id", "-password");

        res.status(201).json(fullGroupChat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Send Message
// @route   POST /api/chat/message
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { content, chat_id, file_id } = req.body;

    if (!content || !chat_id) {
        res.status(400);
        throw new Error("กรุณากรอกข้อความและระบุห้องแชท");
    }

    // ตรวจสอบว่าผู้ใช้อยู่ในห้องแชทนี้หรือไม่
    const chat = await Chat.findOne({
        _id: chat_id,
        user_id: req.user.user_id
    });

    if (!chat) {
        res.status(404);
        throw new Error("ไม่พบห้องแชทหรือคุณไม่ได้เป็นสมาชิกในห้องนี้");
    }

    const newMessage = await Message.create({
        content,
        chat_id,
        user_id: req.user.user_id,
        file_id: file_id || null,
        time: new Date()
    });

    const populatedMessage = await Message.findById(newMessage._id)
        .populate("user_id", "username firstName lastName avatar")
        .populate("file_id");

    // ส่ง Socket event ถ้ามีการตั้งค่า Socket.IO
    if (req.io) {
        req.io.to(`chat:${chat_id}`).emit("new message", populatedMessage);
    }

    res.status(201).json(populatedMessage);
});

// @desc    Get Messages in Chat
// @route   GET /api/chat/messages/:chatId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    // ตรวจสอบว่าผู้ใช้อยู่ในห้องแชทนี้หรือไม่
    const chat = await Chat.findOne({
        _id: chatId,
        user_id: req.user.user_id
    });

    if (!chat) {
        res.status(404);
        throw new Error("ไม่พบห้องแชทหรือคุณไม่ได้เป็นสมาชิกในห้องนี้");
    }

    const messages = await Message.find({ chat_id: chatId })
        .populate("user_id", "username firstName lastName avatar")
        .populate("file_id")
        .sort({ time: 1 });

    res.json(messages);
});

// @desc    Delete Message
// @route   DELETE /api/chat/message/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
        res.status(404);
        throw new Error("ไม่พบข้อความ");
    }

    // ตรวจสอบว่าเป็นผู้ส่งข้อความหรือไม่
    if (message.user_id.toString() !== req.user.user_id.toString()) {
        res.status(403);
        throw new Error("คุณไม่มีสิทธิ์ลบข้อความนี้");
    }

    await Message.deleteOne({ _id: messageId });

    // ส่ง Socket event ถ้ามีการตั้งค่า Socket.IO
    if (req.io) {
        req.io.to(`chat:${message.chat_id}`).emit("message deleted", messageId);
    }

    res.json({ message: "ลบข้อความเรียบร้อยแล้ว" });
});

module.exports = {
    accessChat,
    createGroupChat,
    sendMessage,
    getMessages,
    deleteMessage
};