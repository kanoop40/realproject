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
const { cloudinary } = require('../config/cloudinary');
const path = require('path');
const { fileStorage } = require('../config/cloudinary');

// Multer configuration for file uploads with Cloudinary
const upload = multer({ 
    storage: fileStorage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
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

        // ตรวจสอบว่าแชทระหว่าง 2 คนนี้มีอยู่แล้วหรือไม่ (ปรับปรุง query ให้เร็วขึ้น)
        console.log('🔍 Searching for existing private chat with participants:', [userId1, userId2]);
        const existingChat = await Chatrooms.findOne({
            participants: { $all: [userId1, userId2], $size: 2 }
        })
        .select('_id roomName participants')
        .lean(); // ใช้ lean() เพื่อเพิ่มความเร็ว

        if (existingChat) {
            console.log('✅ Found existing private chat:', existingChat._id);
            
            // ดึงข้อมูลผู้ใช้แค่ที่จำเป็น
            const [user1, user2] = await Promise.all([
                User.findById(userId1).select('firstName lastName username avatar').lean(),
                User.findById(userId2).select('firstName lastName username avatar').lean()
            ]);

            return res.json({
                message: 'แชทนี้มีอยู่แล้ว',
                chatroomId: existingChat._id,
                roomName: existingChat.roomName,
                existing: true,
                participants: [user1, user2]
            });
        }

        // ดึงข้อมูลผู้ใช้พร้อมกัน (parallel)
        console.log('👥 Fetching user data...');
        const [user1, user2] = await Promise.all([
            User.findById(userId1).select('firstName lastName username avatar').lean(),
            User.findById(userId2).select('firstName lastName username avatar').lean()
        ]);

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

        // Get last message for each chatroom และนับข้อความที่ยังไม่ได้อ่าน
        const chatroomsWithLastMessage = await Promise.all(
            chatrooms.map(async (chatroom) => {
                const lastMessage = await Messages.findOne({
                    chat_id: chatroom._id
                })
                .populate('user_id', 'firstName lastName username')
                .sort({ time: -1 });

                // นับข้อความที่คนอื่นส่งมาให้ผู้ใช้ปัจจุบันที่ยังไม่ได้อ่าน
                const unreadCount = await Messages.countDocuments({
                    chat_id: chatroom._id,
                    user_id: { $ne: userId }, // ข้อความที่ไม่ใช่ของเราเอง (คนอื่นส่งมา)
                    'readBy.user': { $ne: userId } // และเรายังไม่ได้อ่าน
                });

                console.log(`📋 Chat ${chatroom._id} unread messages from others:`, unreadCount);

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
                    unreadCount: unreadCount // แสดงจำนวนข้อความที่ยังไม่ได้อ่านจริง
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
        const { limit = 30, page = 1 } = req.query; // ลด default limit เหลือ 30

        console.log('📨 getMessages called for chat:', id, 'by user:', userId, `limit: ${limit}, page: ${page}`);

        // Check if user is participant in this chatroom (รองรับทั้ง user_id และ participants)
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats
                { participants: { $in: [userId] } } // For private chats
            ]
        }).select('_id').lean(); // ใช้ lean() และ select เฉพาะ field ที่จำเป็น

        if (!chatroom) {
            console.log('❌ User not authorized to access this chat');
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
            });
        }

        console.log('✅ User authorized, fetching messages...');

        // ปรับปรุง query เพื่อเพิ่มความเร็ว - ใช้ aggregation pipeline
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const aggregationPipeline = [
            { 
                $match: { 
                    chat_id: new mongoose.Types.ObjectId(id),
                    // Filter out messages that the current user has deleted
                    isDeleted: { $ne: userId }
                } 
            },
            { $sort: { time: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user_id',
                    pipeline: [
                        { $project: { firstName: 1, lastName: 1, username: 1, avatar: 1 } }
                    ]
                }
            },
            { $unwind: '$user_id' },
            {
                $lookup: {
                    from: 'files',
                    localField: 'file_id',
                    foreignField: '_id',
                    as: 'file_id'
                }
            },
            {
                $addFields: {
                    file_id: { $arrayElemAt: ['$file_id', 0] }
                }
            }
        ];

        const messages = await Messages.aggregate(aggregationPipeline);

        // Reverse เพื่อให้เรียงจากเก่าไปใหม่
        messages.reverse();

        console.log(`📨 Found ${messages.length} messages (limit: ${limit}, page: ${page})`);

        res.json({
            messages: messages.map(msg => {
                // สำหรับข้อความที่ส่งโดยผู้ใช้ปัจจุบัน: isRead หมายถึงมีคนอื่นอ่านแล้วหรือไม่
                // สำหรับข้อความของคนอื่น: isRead จะเป็น false เสมอ (เพราะเราไม่ต้องการแสดงสถานะนี้)
                let isRead = false;
                const isMyMessage = msg.user_id._id.toString() === userId.toString();
                
                if (isMyMessage) {
                    // ข้อความของเราเอง: ตรวจสอบว่ามีคนอื่นอ่านหรือไม่
                    isRead = msg.readBy && msg.readBy.some(read => 
                        read.user && read.user.toString() !== userId.toString()
                    );
                    
                    // Debug log สำหรับข้อความของเราเอง
                    console.log(`📖 Message ${msg._id.toString().slice(-4)}: isMyMessage=${isMyMessage}, isRead=${isRead}, readBy count=${msg.readBy?.length || 0}`);
                    if (msg.readBy && msg.readBy.length > 0) {
                        console.log(`📖 ReadBy details:`, msg.readBy.map(r => ({ 
                            userId: r.user.toString(), 
                            readAt: r.readAt, 
                            isNotMe: r.user.toString() !== userId.toString() 
                        })));
                    }
                }
                
                return {
                    _id: msg._id,
                    content: msg.content,
                    sender: msg.user_id,
                    timestamp: msg.time,
                    messageType: msg.messageType,
                    fileUrl: msg.fileUrl,
                    fileName: msg.fileName,
                    fileSize: msg.fileSize,
                    mimeType: msg.mimeType,
                    file: msg.file_id || null,
                    isRead: isRead
                };
            })
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
    console.log('🚀 sendMessage function called - start');
    try {
        console.log('🚀 Inside try block');
        const { id } = req.params;
        console.log('🚀 Got id:', id);
        console.log('🚀 Full req.body:', Object.keys(req.body));
        console.log('🚀 req.body content preview:', JSON.stringify(req.body).substring(0, 500));
        
        const { content, fileData, messageType } = req.body; // เพิ่ม fileData และ messageType สำหรับ base64
        console.log('🚀 Got content:', content);
        console.log('🚀 Got fileData:', !!fileData);
        console.log('🚀 Got messageType:', messageType);
        if (fileData) {
            console.log('🚀 FileData details:', {
                name: fileData.name,
                type: fileData.type,
                base64Length: fileData.base64?.length
            });
        }
        const userId = req.user._id;
        console.log('🚀 Got userId:', userId);
        // Handle both req.file and req.files
        let file = req.file;
        if (!file && req.files && req.files.length > 0) {
            file = req.files.find(f => f.fieldname === 'file') || req.files[0];
        }
        console.log('🚀 Got file:', !!file);
        console.log('🚀 Files array:', req.files);

        console.log('📨 sendMessage request:', {
            chatId: id,
            content,
            userId,
            contentType: req.get('Content-Type'),
            isMultipart: req.get('Content-Type')?.includes('multipart/form-data'),
            hasFile: !!file,
            filesCount: req.files?.length || 0,
            fileDetails: file ? {
                fieldname: file.fieldname,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            } : null
        });

        // แยกเช็คเงื่อนไข: ต้องมีอย่างน้อย content หรือ file หรือ fileData
        if ((!content || content.trim() === '') && !file && !fileData) {
            return res.status(400).json({ message: 'กรุณากรอกข้อความหรือแนบไฟล์' });
        }

        // ถ้ามีไฟล์แต่ไม่มี content ให้ใช้ค่า default
        const messageContent = content?.trim() || (file || fileData ? 'ไฟล์แนบ' : '');

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
        
        // Create message first
        const message = new Messages({
            chat_id: id,
            user_id: userId,
            content: messageContent,
            file_id: null // จะอัปเดตทีหลังถ้ามีไฟล์
        });

        await message.save();

        // If file is uploaded or base64 data provided, save file info to database and link to message
        if (file || fileData) {
            try {
                console.log('🔥 Processing file upload...');
                
                if (fileData) {
                    // Handle base64 file data
                    console.log('🔥 Processing base64 file data:', {
                        name: fileData.name,
                        type: fileData.type,
                        base64Length: fileData.base64?.length
                    });
                    
                    const buffer = Buffer.from(fileData.base64, 'base64');
                    
                    // Upload to Cloudinary
                    const result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'auto',
                                folder: 'chat-app-files',
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        ).end(buffer);
                    });
                    
                    const isImage = fileData.type && fileData.type.startsWith('image/');
                    
                    fileDoc = new File({
                        file_name: fileData.name,
                        url: result.secure_url,
                        user_id: userId,
                        chat_id: id,
                        size: buffer.length.toString(),
                        file_type: fileData.type,
                        Messages_id: message._id
                    });
                    
                    console.log('🔥 Saving base64 file document...');
                    await fileDoc.save();
                    
                    message.file_id = fileDoc._id;
                    message.messageType = isImage ? 'image' : 'file';
                    message.fileUrl = result.secure_url;
                    message.fileName = fileData.name;
                    message.fileSize = buffer.length;
                    message.mimeType = fileData.type;
                } else {
                    // Handle regular file upload
                    console.log('🔥 File details:', {
                        originalname: file.originalname,
                        mimetype: file.mimetype,
                        size: file.size,
                        path: file.path,
                        fieldname: file.fieldname
                    });
                    
                    const isImage = file.mimetype && file.mimetype.startsWith('image/');
                    console.log('🔥 File type check - isImage:', isImage, 'mimetype:', file.mimetype);
                
                    fileDoc = new File({
                        file_name: file.originalname,
                        url: file.path, // Use Cloudinary URL
                        user_id: userId,
                        chat_id: id,
                        size: file.size.toString(),
                        file_type: file.mimetype,
                        Messages_id: message._id // เชื่อมโยงกับ message ที่สร้างแล้ว
                    });
                    
                    console.log('🔥 Saving file document...');
                    await fileDoc.save();
                    console.log('🔥 File document saved with ID:', fileDoc._id);

                    // อัปเดต message ให้มี file_id และข้อมูลไฟล์
                    message.file_id = fileDoc._id;
                    message.messageType = isImage ? 'image' : 'file';
                    message.fileUrl = file.path;
                    message.fileName = file.originalname;
                    message.fileSize = file.size;
                    message.mimeType = file.mimetype;
                }
            
            console.log('🔥 Updating message with file info...');
            await message.save();
            console.log('🔥 Message updated successfully');
            
        } catch (fileError) {
            console.error('❌ Error processing file:', fileError);
            // ถ้า file processing ล้มเหลว ให้ส่งเป็น text message แทน
        }
        } else {
            console.log('📝 No file detected, saving as text message')
            if (messageType) {
                console.log('⚠️ MessageType provided but no file/fileData found:', messageType);
            }
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

        // ส่งข้อความแบบ real-time ผ่าน SSE
        try {
            const sseManager = req.app.get('sseManager') || req.sseManager;
            if (sseManager) {
                // Populate sender data สำหรับ SSE broadcast
                const populatedMessage = await Messages.findById(message._id)
                    .populate('user_id', 'firstName lastName username avatar role')
                    .populate('file_id');
                
                const messageData = {
                    _id: populatedMessage._id,
                    content: populatedMessage.content,
                    sender: populatedMessage.user_id,
                    timestamp: populatedMessage.time,
                    messageType: populatedMessage.messageType,
                    fileUrl: populatedMessage.fileUrl,
                    fileName: populatedMessage.fileName,
                    fileSize: populatedMessage.fileSize,
                    mimeType: populatedMessage.mimeType,
                    file: populatedMessage.file_id || null,
                    user_id: populatedMessage.user_id // เพิ่มเพื่อ backward compatibility
                };

                // ส่งผ่าน SSE
                const sentCount = sseManager.sendNewMessage(id, messageData, req.user.userId);
                
                console.log('📡 Message broadcasted via SSE to room:', id);
                console.log('📡 Sent to', sentCount, 'users in room');
                console.log('📡 Broadcasted message sender:', populatedMessage.user_id.firstName, populatedMessage.user_id.lastName);
                
                // ส่งผ่าน Socket.io ด้วย
                const io = req.app.get('io');
                if (io) {
                    io.to(id).emit('newMessage', {
                        chatroomId: id,
                        message: messageData
                    });
                    console.log('📤 Private message emitted via Socket.io to room:', id);
                }
            } else {
                console.warn('⚠️ SSE Manager instance not found');
            }
        } catch (sseError) {
            console.error('Error broadcasting via SSE:', sseError);
        }

        const responseData = {
            _id: message._id,
            content: message.content,
            sender: message.user_id,
            timestamp: message.time,
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            fileSize: message.fileSize,
            mimeType: message.mimeType,
            file: message.file_id || null
        };
        
        console.log('🎉 Sending response:', {
            messageType: responseData.messageType,
            hasFile: !!responseData.file,
            fileUrl: responseData.fileUrl,
            fileName: responseData.fileName
        });

        res.status(201).json(responseData);
    } catch (error) {
        console.error('❌❌❌ Error sending message:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
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

        console.log('📖 markAsRead called for chat:', id, 'by user:', userId);

        // Check if user is participant in this chatroom (รองรับทั้ง user_id และ participants)
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats  
                { participants: { $in: [userId] } } // For private chats
            ]
        });

        if (!chatroom) {
            console.log('❌ User not authorized to mark messages as read');
            return res.status(403).json({
                message: 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
            });
        }

        // อัพเดทข้อความของคนอื่นให้ถูกมาร์คว่าผู้ใช้ปัจจุบันอ่านแล้ว
        const updateResult = await Messages.updateMany(
            { 
                chat_id: id,
                user_id: { $ne: userId }, // ข้อความของคนอื่น
                'readBy.user': { $ne: userId } // ยังไม่ได้อ่านโดยผู้ใช้ปัจจุบัน
            },
            { 
                $push: { 
                    readBy: { 
                        user: userId, 
                        readAt: new Date() 
                    } 
                }
            }
        );

        console.log('📖 Messages marked as read by current user:', updateResult.modifiedCount);

        // ส่ง socket event เฉพาะเมื่อมีข้อความที่ถูกอ่านจริงๆ
        if (updateResult.modifiedCount > 0 && req.app.locals.io) {
            req.app.locals.io.to(id).emit('messageRead', {
                chatroomId: id,
                readBy: userId,
                timestamp: new Date()
            });
            console.log('✅ MessageRead event emitted via HTTP');
        } else {
            console.log('📖 No unread messages from others, skipping messageRead event');
        }

        console.log('✅ Messages marked as read successfully');
        res.json({ message: 'อ่านข้อความแล้ว' });
    } catch (error) {
        console.error('❌ Error marking as read:', error);
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
        console.log('🔍 UserId type:', typeof userId, 'UserId string:', userId.toString());

        // ตรวจสอบว่า chatroom มีอยู่หรือไม่
        const existingChatroom = await Chatrooms.findById(id);
        console.log('🔍 Chatroom exists:', !!existingChatroom);
        
        if (existingChatroom) {
            console.log('📋 Chatroom type:', existingChatroom.type);
            console.log('📋 Chatroom user_id:', existingChatroom.user_id);
            console.log('📋 Chatroom participants:', existingChatroom.participants);
        }

        // Check if user is participant in this chatroom
        // For private chats, check participants array; for group chats, check user_id
        const chatroom = await Chatrooms.findOne({
            _id: id,
            $or: [
                { user_id: { $in: [userId] } }, // For group chats
                { participants: { $in: [userId] } } // For private chats
            ]
        });

        console.log('🔍 Found chatroom with permissions:', chatroom ? 'yes' : 'no');

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
        const messageId = req.params.id || req.params.messageId;
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

        // เพิ่ม userId ใน isDeleted array (soft delete per user)
        if (!message.isDeleted.includes(userId)) {
            message.isDeleted.push(userId);
            await message.save();
        }

        // ส่ง socket event ให้ client อื่นๆ
        const io = req.app.get('io');
        if (io) {
            io.to(message.chat_id.toString()).emit('message_deleted', {
                chatroomId: message.chat_id,
                messageId: messageId,
                deletedBy: userId
            });
        }

        res.json({
            success: true,
            message: 'ลบข้อความเรียบร้อยแล้ว',
            data: {
                messageId,
                deletedBy: userId
            }
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

// @desc    Edit a message
// @route   PUT /api/chats/messages/:id
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
    try {
        const messageId = req.params.id;
        const { content } = req.body;
        const currentUserId = req.user._id;

        console.log('✏️ Edit message request:', { messageId, content, currentUserId });

        // ตรวจสอบว่าข้อความใหม่ไม่ว่าง
        if (!content || content.trim() === '') {
            return res.status(400).json({
                message: 'กรุณาใส่เนื้อหาข้อความ'
            });
        }

        // หาข้อความที่ต้องการแก้ไข
        const message = await Messages.findById(messageId)
            .populate('user_id', 'firstName lastName avatar');

        if (!message) {
            return res.status(404).json({
                message: 'ไม่พบข้อความที่ต้องการแก้ไข'
            });
        }

        // ตรวจสอบว่าเป็นเจ้าของข้อความหรือไม่
        if (message.user_id._id.toString() !== currentUserId.toString()) {
            return res.status(403).json({
                message: 'คุณไม่สามารถแก้ไขข้อความของผู้อื่นได้'
            });
        }

        // ตรวจสอบว่าเป็นข้อความแบบ text เท่านั้น
        if (message.messageType !== 'text') {
            return res.status(400).json({
                message: 'สามารถแก้ไขได้เฉพาะข้อความข้อความเท่านั้น'
            });
        }

        // อัปเดตข้อความ
        message.content = content.trim();
        message.editedAt = new Date();
        await message.save();

        console.log('✅ Message edited successfully:', messageId);

        // ส่งข้อมูลข้อความที่แก้ไขแล้วกลับไป
        const editedMessage = await Messages.findById(messageId)
            .populate('user_id', 'firstName lastName avatar');

        // ส่ง socket event เพื่อแจ้งผู้อื่นว่าข้อความถูกแก้ไข
        if (req.app.locals.io) {
            const socketData = {
                messageId: editedMessage._id,
                content: editedMessage.content,
                editedAt: editedMessage.editedAt,
                chatroomId: message.chat_id,
                groupId: message.group_id
            };

            if (message.group_id) {
                req.app.locals.io.to(message.group_id.toString()).emit('message_edited', socketData);
            } else {
                req.app.locals.io.to(message.chat_id.toString()).emit('message_edited', socketData);
            }
        }

        res.json({
            success: true,
            message: 'แก้ไขข้อความสำเร็จ',
            data: {
                _id: editedMessage._id,
                content: editedMessage.content,
                editedAt: editedMessage.editedAt,
                sender: editedMessage.user_id
            }
        });

    } catch (error) {
        console.error('❌ Error editing message:', error);
        res.status(500).json({
            message: 'เกิดข้อผิดพลาดในการแก้ไขข้อความ',
            error: error.message
        });
    }
});

// @desc    Check for new messages without loading all messages (Smart Heartbeat)
// @route   GET /api/chats/:id/check-new
// @access  Private
const checkNewMessages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { since, count } = req.query;
    
    try {
        // ตรวจสอบจำนวนข้อความปัจจุบัน
        const currentCount = await Messages.countDocuments({ chat_id: id });
        
        // ตรวจสอบข้อความล่าสุด
        const latestMessage = await Messages.findOne({ chat_id: id })
            .sort({ time: -1 })
            .select('time');
        
        const hasNew = since ? 
            (latestMessage && new Date(latestMessage.time) > new Date(since)) :
            (currentCount > parseInt(count || 0));
        
        res.json({
            hasNew,
            currentCount,
            latestTimestamp: latestMessage?.time || new Date().toISOString(),
            newCount: currentCount
        });
    } catch (error) {
        console.error('Error checking new messages:', error);
        res.status(500).json({ message: 'ไม่สามารถตรวจสอบข้อความใหม่ได้' });
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
    editMessage,
    markMessageAsRead,
    getUnreadCount,
    markAllAsRead,
    getChatParticipants,
    checkNewMessages
};
