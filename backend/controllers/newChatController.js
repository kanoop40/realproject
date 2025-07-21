const asyncHandler = require('express-async-handler');
const Chatrooms = require('../models/ChatroomsModel');
const Messages = require('../models/MessagesModel');
const File = require('../models/FileModel');
const User = require('../models/UserModel');
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/files/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow all file types
        cb(null, true);
    }
});

// @desc    Get all chatrooms for current user
// @route   GET /api/chats
// @access  Private
const getChats = asyncHandler(async (req, res) => {
    try {
        console.log('getChats called by user:', req.user._id);
        const userId = req.user._id;

        const chatrooms = await Chatrooms.find({
            user_id: userId
        })
        .populate('user_id', 'firstName lastName username avatar role')
        .sort({ updatedAt: -1 });

        console.log(`Found ${chatrooms.length} chatrooms for user:`, userId);

        // Get last message for each chatroom
        const chatroomsWithLastMessage = await Promise.all(
            chatrooms.map(async (chatroom) => {
                const lastMessage = await Messages.findOne({
                    chat_id: chatroom._id
                })
                .populate('user_id', 'firstName lastName username')
                .sort({ time: -1 });

                return {
                    _id: chatroom._id,
                    roomName: chatroom.roomName,
                    participants: chatroom.user_id,
                    groupAvatar: chatroom.groupAvatar,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
                        sender: lastMessage.user_id,
                        timestamp: lastMessage.time
                    } : null,
                    unreadCount: 0 // TODO: Implement unread count logic
                };
            })
        );

        console.log('Returning chatrooms:', chatroomsWithLastMessage.length);
        res.json(chatroomsWithLastMessage);
    } catch (error) {
        console.error('Error in getChats:', error);
        console.error('Error getting chats:', error);
        res.status(500).json({ 
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแชท',
            error: error.message 
        });
    }
});

// @desc    Get messages for a specific chatroom
// @route   GET /api/chats/:id/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Check if user is participant in this chatroom
        const chatroom = await Chatrooms.findOne({
            _id: id,
            user_id: userId
        });

        if (!chatroom) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
            });
        }

        const messages = await Messages.find({
            chat_id: id
        })
        .populate('user_id', 'firstName lastName username avatar')
        .populate('file_id')
        .sort({ time: 1 });

        res.json({
            messages: messages.map(msg => ({
                _id: msg._id,
                content: msg.content,
                sender: msg.user_id,
                timestamp: msg.time,
                file: msg.file_id || null
            }))
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อความ',
            error: error.message
        });
    }
});

// @desc    Send message with optional file
// @route   POST /api/chats/:id/messages  
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user._id;
        const file = req.file;

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'กรุณากรอกข้อความ' });
        }

        // Check if user is participant in this chatroom
        const chatroom = await Chatrooms.findOne({
            _id: id,
            user_id: userId
        });

        if (!chatroom) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์ส่งข้อความในแชทนี้'
            });
        }

        let fileDoc = null;
        
        // If file is uploaded, save file info to database
        if (file) {
            fileDoc = new File({
                file_name: file.originalname,
                url: `/uploads/files/${file.filename}`,
                user_id: userId,
                chat_id: id,
                size: file.size.toString(),
                file_type: file.mimetype
            });
            await fileDoc.save();
        }

        // Create message
        const message = new Messages({
            chat_id: id,
            user_id: userId,
            content: content.trim(),
            file_id: fileDoc ? fileDoc._id : null
        });

        await message.save();

        // Update message with file reference if needed
        if (fileDoc) {
            fileDoc.Messages_id = message._id;
            await fileDoc.save();
        }

        // Populate message for response
        await message.populate('user_id', 'firstName lastName username avatar');
        if (fileDoc) {
            await message.populate('file_id');
        }

        res.status(201).json({
            _id: message._id,
            content: message.content,
            sender: message.user_id,
            timestamp: message.time,
            file: message.file_id || null
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการส่งข้อความ',
            error: error.message
        });
    }
});

// @desc    Create new chatroom
// @route   POST /api/chats
// @access  Private
const createChatroom = asyncHandler(async (req, res) => {
    try {
        const { roomName, participants } = req.body;
        const userId = req.user._id;

        if (!roomName || !participants || participants.length === 0) {
            return res.status(400).json({
                message: 'กรุณาระบุชื่อห้องและผู้เข้าร่วม'
            });
        }

        // Add current user to participants if not already included
        const allParticipants = [...new Set([userId.toString(), ...participants])];

        const chatroom = new Chatrooms({
            roomName,
            user_id: allParticipants
        });

        await chatroom.save();
        await chatroom.populate('user_id', 'firstName lastName username avatar role');

        res.status(201).json(chatroom);
    } catch (error) {
        console.error('Error creating chatroom:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท',
            error: error.message
        });
    }
});

// @desc    Mark messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Check if user is participant in this chatroom
        const chatroom = await Chatrooms.findOne({
            _id: id,
            user_id: userId
        });

        if (!chatroom) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
            });
        }

        // This would be used for notification system
        // For now, just return success
        res.json({ message: 'อ่านข้อความแล้ว' });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะอ่านข้อความ',
            error: error.message
        });
    }
});

// @desc    Delete chatroom
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChatroom = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Check if user is participant in this chatroom
        const chatroom = await Chatrooms.findOne({
            _id: id,
            user_id: userId
        });

        if (!chatroom) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์ลบแชทนี้'
            });
        }

        // Delete all messages in the chatroom
        await Messages.deleteMany({ chat_id: id });
        
        // Delete all files related to the chatroom
        await File.deleteMany({ chat_id: id });
        
        // Delete the chatroom
        await Chatrooms.findByIdAndDelete(id);

        res.json({ message: 'ลบห้องแชทเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('Error deleting chatroom:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการลบห้องแชท',
            error: error.message
        });
    }
});

module.exports = {
    getChats,
    getMessages,
    sendMessage: [upload.single('file'), sendMessage],
    createChatroom,
    markAsRead,
    deleteChatroom
};
