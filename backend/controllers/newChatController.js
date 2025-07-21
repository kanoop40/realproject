const asyncHandler = require('express-async-handler');
const Chatrooms = require('../models/ChatroomsModel');
const Messages = require('../models/MessagesModel');
const File = require('../models/FileModel');
const User = require('../models/UserModel');
const GroupChat = require('../models/GroupChatModel');
const Notification = require('../models/NotificationModel');
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
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow PDF, Word, Images and common file types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('รองรับเฉพาะไฟล์ PDF, Word, รูปภาพ และไฟล์เอกสารเท่านั้น'), false);
        }
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

// @desc    Delete a message
// @route   DELETE /api/chats/messages/:id
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.user._id;

        const message = await Messages.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: 'ไม่พบข้อความ'
            });
        }

        // ตรวจสอบว่าเป็นเจ้าของข้อความหรือไม่
        if (message.user_id.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์ลบข้อความนี้'
            });
        }

        // อัพเดทข้อความเป็น "ลบแล้ว" แทนการลบจริง
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = userId;
        message.content = 'ข้อความนี้ถูกลบแล้ว';
        
        await message.save();

        res.json({
            success: true,
            message: 'ลบข้อความเรียบร้อยแล้ว',
            data: message
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการลบข้อความ',
            error: error.message
        });
    }
});

// @desc    Mark message as read
// @route   POST /api/chats/messages/:id/read
// @access  Private
const markMessageAsRead = asyncHandler(async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.user._id;

        const message = await Messages.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: 'ไม่พบข้อความ'
            });
        }

        // ทำเครื่องหมายว่าอ่านแล้ว
        await message.markAsRead(userId);

        res.json({
            success: true,
            message: 'ทำเครื่องหมายอ่านแล้วเรียบร้อย'
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายข้อความ',
            error: error.message
        });
    }
});

// @desc    Get unread messages count
// @route   GET /api/chats/:id/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id;

        const unreadCount = await Messages.countDocuments({
            chat_id: chatId,
            user_id: { $ne: userId }, // ไม่นับข้อความของตัวเอง
            readBy: { $not: { $elemMatch: { user: userId } } }
        });

        res.json({
            success: true,
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการนับข้อความที่ยังไม่อ่าน',
            error: error.message
        });
    }
});

// @desc    Mark all messages in chat as read
// @route   POST /api/chats/:id/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id;

        // หาข้อความทั้งหมดที่ยังไม่อ่าน
        const unreadMessages = await Messages.find({
            chat_id: chatId,
            user_id: { $ne: userId },
            readBy: { $not: { $elemMatch: { user: userId } } }
        });

        // ทำเครื่องหมายอ่านแล้วทีละข้อความ
        for (const message of unreadMessages) {
            await message.markAsRead(userId);
        }

        res.json({
            success: true,
            message: 'ทำเครื่องหมายอ่านทั้งหมดเรียบร้อยแล้ว',
            markedCount: unreadMessages.length
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายอ่านทั้งหมด',
            error: error.message
        });
    }
});

// @desc    Get chat participants
// @route   GET /api/chats/:id/participants
// @access  Private
const getChatParticipants = asyncHandler(async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id;

        // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของแชทหรือไม่
        const userChatroom = await Chatrooms.findOne({
            _id: chatId,
            user_id: userId
        });

        if (!userChatroom) {
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
            });
        }

        // หาผู้เข้าร่วมทั้งหมด
        const participants = await Chatrooms.find({ _id: chatId })
            .populate('user_id', 'firstName lastName username avatar role isOnline lastSeen')
            .select('user_id');

        const participantList = participants.map(p => ({
            _id: p.user_id._id,
            firstName: p.user_id.firstName,
            lastName: p.user_id.lastName,
            username: p.user_id.username,
            avatar: p.user_id.avatar,
            role: p.user_id.role,
            isOnline: p.user_id.isOnline,
            lastSeen: p.user_id.lastSeen
        }));

        res.json({
            success: true,
            participants: participantList,
            count: participantList.length
        });
    } catch (error) {
        console.error('Error getting chat participants:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้เข้าร่วม',
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
    deleteChatroom,
    deleteMessage,
    markMessageAsRead,
    getUnreadCount,
    markAllAsRead,
    getChatParticipants
};
