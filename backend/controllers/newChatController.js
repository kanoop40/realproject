const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Chatrooms = require('../models/ChatroomsModel');
const Messages = require('../models/MessagesModel');
const File = require('../models/FileModel');
const User = require('../models/UserModel');
const GroupChat = require('../models/GroupChatModel');
const Notification = require('../models/NotificationModel');
const NotificationService = require('../utils/notificationService');
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

// @desc    Create or get a private chat between two users
// @route   POST /api/chats/private
// @access  Private
const createPrivateChat = asyncHandler(async (req, res) => {
    try {
        const { participants } = req.body;
        const currentUserId = req.user._id;

        console.log('🔍 createPrivateChat called with:', { participants, currentUserId });

        if (!participants || !Array.isArray(participants) || participants.length !== 2) {
            return res.status(400).json({
                message: 'กรุณาระบุผู้เข้าร่วมแชท 2 คน'
            });
        }

        const userId1 = participants[0];
        const userId2 = participants[1];

        console.log('🔍 Creating private chat between:', { userId1, userId2 });

        // ตรวจสอบว่า userId ถูกต้อง
        if (!userId1 || !userId2) {
            console.error('❌ Invalid user IDs:', { userId1, userId2 });
            return res.status(400).json({
                message: 'ข้อมูลผู้ใช้ไม่ถูกต้อง'
            });
        }

        // ตรวจสอบว่าแชทระหว่าง 2 คนนี้มีอยู่แล้วหรือไม่ (ใช้ participants field)
        console.log('🔍 Searching for existing private chat with participants:', [userId1, userId2]);
        const existingChat = await Chatrooms.findOne({
            participants: { $all: [userId1, userId2], $size: 2 }
        }).populate('participants', 'firstName lastName username avatar');

        if (existingChat) {
            console.log('✅ Found existing private chat:', existingChat._id);
            return res.json({
                message: 'แชทนี้มีอยู่แล้ว',
                chatroomId: existingChat._id,
                roomName: existingChat.roomName,
                existing: true
            });
        }

        // ดึงข้อมูลผู้ใช้
        console.log('👥 Fetching user data...');
        const user1 = await User.findById(userId1);
        const user2 = await User.findById(userId2);

        if (!user1 || !user2) {
            console.error('❌ User not found:', { user1: !!user1, user2: !!user2 });
            return res.status(404).json({
                message: 'ไม่พบผู้ใช้ที่ระบุ'
            });
        }

        // สร้างชื่อแชท
        const roomName = `${user1.firstName} ${user1.lastName} & ${user2.firstName} ${user2.lastName}`;

        console.log('🆕 Creating new private chat:', { roomName, participants: [userId1, userId2] });

        // สร้าง Chatroom ใหม่แบบ participants array
        const newChatroom = new Chatrooms({
            roomName: roomName,
            participants: [userId1, userId2], // ใช้ participants array แทน user_id
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const savedChatroom = await newChatroom.save();
        console.log('✅ Created new private chat:', savedChatroom._id);

        // Populate participants สำหรับ response
        await savedChatroom.populate('participants', 'firstName lastName username avatar');

        res.status(201).json({
            message: 'สร้างแชทส่วนตัวสำเร็จ',
            chatroomId: savedChatroom._id,
            roomName: savedChatroom.roomName,
            existing: false,
            participants: savedChatroom.participants
        });

    } catch (error) {
        console.error('❌ Error creating private chat:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการสร้างแชท',
            error: error.message
        });
    }
});

// @desc    Get all chatrooms for current user
// @route   GET /api/chats
// @access  Private
const getChats = asyncHandler(async (req, res) => {
    try {
        console.log('🔍 getChats called by user:', req.user._id);
        const userId = req.user._id;

        // ค้นหา chatrooms ที่ user เป็น participant
        // ใช้ $or เพื่อค้นหาทั้ง user_id (group chats) และ participants (private chats)
        const chatrooms = await Chatrooms.find({
            $or: [
                { user_id: { $in: [userId] } }, // For group chats
                { participants: { $in: [userId] } } // For private chats
            ]
        })
        .populate('user_id', 'firstName lastName username avatar role')
        .populate('participants', 'firstName lastName username avatar role')
        .sort({ updatedAt: -1 });

        console.log(`📋 Found ${chatrooms.length} chatrooms for user:`, userId);
        console.log('📋 Sample chatroom structure:', chatrooms[0] ? {
            id: chatrooms[0]._id,
            roomName: chatrooms[0].roomName,
            hasUserIdField: !!chatrooms[0].user_id,
            hasParticipantsField: !!chatrooms[0].participants,
            userIdLength: chatrooms[0].user_id?.length || 0,
            participantsLength: chatrooms[0].participants?.length || 0
        } : 'none');

        // Get last message for each chatroom
        const chatroomsWithLastMessage = await Promise.all(
            chatrooms.map(async (chatroom) => {
                const lastMessage = await Messages.findOne({
                    chat_id: chatroom._id
                })
                .populate('user_id', 'firstName lastName username')
                .sort({ time: -1 });

                // ใช้ participants สำหรับ private chats, user_id สำหรับ group chats
                const participants = chatroom.participants?.length > 0 
                    ? chatroom.participants 
                    : chatroom.user_id;

                console.log(`📋 Chat ${chatroom._id} participants:`, participants?.map(p => ({
                    id: p._id,
                    name: `${p.firstName} ${p.lastName}`
                })));

                return {
                    _id: chatroom._id,
                    roomName: chatroom.roomName,
                    participants: participants,
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

        console.log('✅ Returning chatrooms:', chatroomsWithLastMessage.length);
        if (chatroomsWithLastMessage[0]) {
            console.log('✅ Sample processed chatroom:', {
                id: chatroomsWithLastMessage[0]._id,
                roomName: chatroomsWithLastMessage[0].roomName,
                participantsCount: chatroomsWithLastMessage[0].participants?.length || 0,
                participants: chatroomsWithLastMessage[0].participants?.map(p => ({
                    id: p._id,
                    name: `${p.firstName} ${p.lastName}`,
                    avatar: p.avatar
                }))
            });
        }
        
        res.json(chatroomsWithLastMessage);
    } catch (error) {
        console.error('❌ Error in getChats:', error);
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

        console.log('📨 getMessages called for chat:', id, 'by user:', userId);

        // Check if user is participant in this chatroom (รองรับทั้ง user_id และ participants)
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats
                { participants: { $in: [userId] } } // For private chats
            ]
        });

        if (!chatroom) {
            console.log('❌ User not authorized to access this chat');
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
            });
        }

        console.log('✅ User authorized, fetching messages...');

        const messages = await Messages.find({
            chat_id: id
        })
        .populate('user_id', 'firstName lastName username avatar')
        .populate('file_id')
        .sort({ time: 1 });

        console.log(`📨 Found ${messages.length} messages`);

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
        console.error('❌ Error getting messages:', error);
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

        // Check if user is participant in this chatroom (รองรับทั้ง user_id และ participants)
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats
                { participants: { $in: [userId] } } // For private chats
            ]
        });

        if (!chatroom) {
            console.log('❌ User not authorized to send message to this chat');
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

        // ส่ง notification ไปยังผู้เข้าร่วมแชทคนอื่น ๆ
        try {
            let recipients = [];
            const sender = message.user_id;
            const senderName = `${sender.firstName} ${sender.lastName}`;
            
            // หาผู้เข้าร่วมแชทคนอื่น ๆ รองรับทั้ง user_id และ participants
            if (chatroom.participants && chatroom.participants.length > 0) {
                // Use participants array (new schema)
                const participantIds = chatroom.participants
                    .filter(id => id.toString() !== userId.toString());
                
                recipients = await User.find({
                    _id: { $in: participantIds },
                    pushToken: { $exists: true, $ne: null }
                });
            } else if (chatroom.user_id && chatroom.user_id.length > 0) {
                // Use user_id array (old schema)
                const userIds = chatroom.user_id
                    .filter(id => id.toString() !== userId.toString());
                
                recipients = await User.find({
                    _id: { $in: userIds },
                    pushToken: { $exists: true, $ne: null }
                });
            }

            // ส่ง notification ไปยังแต่ละคน
            for (const recipient of recipients) {
                await NotificationService.sendNewMessageNotification(
                    recipient.pushToken,
                    senderName,
                    content.trim(),
                    id
                );
                
                // ส่ง socket notification ด้วย
                const io = req.app.get('io') || req.io;
                if (io) {
                    io.to(recipient._id.toString()).emit('receiveNotification', {
                        type: 'new_message',
                        title: `ข้อความใหม่จาก ${senderName}`,
                        message: content.trim(),
                        chatroomId: id,
                        senderId: userId,
                        timestamp: new Date()
                    });
                }
            }
            
            console.log(`📲 Sent notifications to ${recipients.length} recipients`);
        } catch (notificationError) {
            console.error('Error sending notifications:', notificationError);
            // ไม่ให้ error ของ notification มากระทบการส่งข้อความ
        }

        // ส่งข้อความแบบ real-time ผ่าน Socket.IO
        try {
            const io = req.app.get('io') || req.io;
            if (io) {
                // Populate sender data สำหรับ socket broadcast
                const populatedMessage = await Messages.findById(message._id)
                    .populate('user_id', 'firstName lastName username avatar role')
                    .populate('file_id');
                
                io.to(id).emit('newMessage', {
                    message: {
                        _id: populatedMessage._id,
                        content: populatedMessage.content,
                        sender: populatedMessage.user_id,
                        timestamp: populatedMessage.time,
                        file: populatedMessage.file_id || null,
                        user_id: populatedMessage.user_id // เพิ่มเพื่อ backward compatibility
                    },
                    chatroomId: id
                });
                console.log('📡 Message broadcasted via Socket.IO to room:', id);
                console.log('📡 Broadcasted message sender:', populatedMessage.user_id.firstName, populatedMessage.user_id.lastName);
            } else {
                console.warn('⚠️ Socket.IO instance not found');
            }
        } catch (socketError) {
            console.error('Error broadcasting via Socket.IO:', socketError);
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

        // Check if user is participant in this chatroom (รองรับทั้ง user_id และ participants)
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats  
                { participants: { $in: [userId] } } // For private chats
            ]
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

        console.log('🗑️ Deleting chatroom:', id, 'by user:', userId);

        // Check if user is participant in this chatroom
        // For private chats, check participants array; for group chats, check user_id
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats
                { participants: { $in: [userId] } } // For private chats
            ]
        });

        console.log('🔍 Found chatroom:', chatroom ? 'yes' : 'no');

        if (!chatroom) {
            console.log('❌ User not authorized to delete this chat');
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์ลบแชทนี้'
            });
        }

        console.log('🗑️ Deleting messages for chat:', id);
        // Delete all messages in the chatroom
        const messagesResult = await Messages.deleteMany({ chat_id: id });
        console.log('🗑️ Deleted messages:', messagesResult.deletedCount);
        
        console.log('🗑️ Deleting files for chat:', id);
        // Delete all files related to the chatroom
        const filesResult = await File.deleteMany({ chat_id: id });
        console.log('🗑️ Deleted files:', filesResult.deletedCount);
        
        console.log('🗑️ Deleting chatroom:', id);
        // Delete the chatroom
        const deletedChatroom = await Chatrooms.findByIdAndDelete(id);
        console.log('🗑️ Chatroom deleted:', deletedChatroom ? 'success' : 'failed');

        res.json({ 
            message: 'ลบห้องแชทเรียบร้อยแล้ว',
            deletedMessages: messagesResult.deletedCount,
            deletedFiles: filesResult.deletedCount
        });
    } catch (error) {
        console.error('❌ Error deleting chatroom:', error);
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
    createPrivateChat,
    markAsRead,
    deleteChatroom,
    deleteMessage,
    markMessageAsRead,
    getUnreadCount,
    markAllAsRead,
    getChatParticipants
};
