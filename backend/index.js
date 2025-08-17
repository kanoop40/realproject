const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Routes imports
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Middleware imports
const { errorHandler } = require('./Middleware/errorMiddleware');

const app = express();
const server = http.createServer(app);

// Environment variables with defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:19006';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    [
        'http://localhost:19006', 
        'http://localhost:8081', 
        'http://localhost:8082', // Expo alternative port
        'https://localhost:19006',
        'https://localhost:8081',
        'https://localhost:8082',
        'http://b1s-ely-anonymous-8081.exp.direct',
        'http://b1s-ely-anonymous-8082.exp.direct',
        'https://b1s-ely-anonymous-8081.exp.direct',
        'https://b1s-ely-anonymous-8082.exp.direct',
        'exp://192.168.1.34:8081',
        'exp://192.168.1.34:8082', // Expo alternative port
        'http://192.168.1.34:8081',
        'http://192.168.1.34:8082', // Expo alternative port
        'https://192.168.1.34:8081',
        'https://192.168.1.34:8082', // Expo alternative port
        'http://192.168.1.34:19006',
        'https://192.168.1.34:19006'
    ];

// Socket.IO configuration with environment-based CORS
const io = socketIo(server, {
    cors: {
        origin: function(origin, callback) {
            console.log('🔌 Socket.IO CORS request from:', origin);
            
            // อนุญาตทุกคำขอใน development
            if (NODE_ENV === 'development') {
                return callback(null, true);
            }
            
            // ใน production ตรวจสอบเหมือน HTTP CORS
            if (!origin) {
                return callback(null, true);
            }
            
            const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
                return origin === allowedOrigin || 
                       origin.includes('exp://') || 
                       origin.includes('.exp.direct') ||
                       /^https?:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
                       /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
                       /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin);
            });
            
            if (isAllowed) {
                console.log('✅ Socket.IO origin allowed:', origin);
                return callback(null, true);
            }
            
            console.log('❌ Socket.IO origin not allowed:', origin);
            return callback(null, false);
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS middleware - รองรับ Expo development และ production
app.use(cors({
    origin: function (origin, callback) {
        console.log('🌐 CORS request from origin:', origin);
        
        // อนุญาตทุกคำขอใน development
        if (NODE_ENV === 'development') {
            console.log('✅ Development mode - allowing all origins');
            return callback(null, true);
        }
        
        // ใน production ตรวจสอบ origin
        if (!origin) {
            console.log('✅ No origin (same-origin) - allowing');
            return callback(null, true);
        }
        
        // ตรวจสอบ allowed origins
        const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
            return origin === allowedOrigin || 
                   origin.includes('exp://') || // Expo development
                   origin.includes('.exp.direct') || // Expo tunnel
                   /^https?:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) || // Local IP
                   /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) || // Local IP 10.x
                   /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin); // Local IP 172.x
        });
        
        if (isAllowed) {
            console.log('✅ Origin allowed:', origin);
            return callback(null, true);
        }
        
        console.log('❌ Origin not allowed:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

// Rate limiting with environment configuration
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // limit each IP
    message: {
        error: 'Too many requests from this IP',
        retryAfter: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) + 'mb';
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Logging middleware 
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Serve static files (for uploaded images and files)
const uploadPath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection with error handling
if (!MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is required');
    process.exit(1);
}

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`🔗 Database: ${MONGO_URI.split('@')[1]?.split('/')[0] || 'Unknown'}`);
    
    // ทดสอบการเชื่อมต่อ
    try {
        const User = require('./models/UserModel');
        const testConnection = await User.findOne();
        console.log('✅ Database connection test:', testConnection ? 'Successful' : 'No users found');
    } catch (err) {
        console.error('❌ Database test error:', err);
    }
})
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Socket.IO connection handling
const activeUsers = new Map();
const jwt = require('jsonwebtoken');

io.on('connection', async (socket) => {
    console.log('👤 User connected:', socket.id);
    
    // Authenticate socket connection
    try {
        const token = socket.handshake.auth.token;
        const userId = socket.handshake.auth.userId;
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId || userId;
            activeUsers.set(socket.userId, socket.id);
            
            // อัพเดทสถานะออนไลน์
            const User = require('./models/UserModel');
            await User.findByIdAndUpdate(socket.userId, {
                isOnline: true,
                lastSeen: new Date()
            });
            
            console.log(`✅ User ${socket.userId} authenticated and connected`);
            
            // แจ้งผู้ใช้อื่นว่าผู้ใช้นี้ออนไลน์
            socket.broadcast.emit('user_online', socket.userId);
        }
    } catch (error) {
        console.error('❌ Socket authentication error:', error);
        socket.disconnect();
        return;
    }

    // เมื่อผู้ใช้เข้าร่วม
    socket.on('join', async (userId) => {
        try {
            socket.userId = userId;
            activeUsers.set(userId, socket.id);
            
            // อัพเดทสถานะออนไลน์
            const User = require('./models/UserModel');
            await User.findByIdAndUpdate(userId, {
                isOnline: true,
                lastSeen: new Date()
            });

            console.log(`✅ User ${userId} joined and is now online`);
            
            // แจ้งผู้ใช้อื่นว่าผู้ใช้นี้ออนไลน์
            socket.broadcast.emit('user_online', userId);
        } catch (error) {
            console.error('❌ Error in join event:', error);
        }
    });

    // เข้าร่วมห้องแชท
    socket.on('joinRoom', (chatroomId) => {
        socket.join(chatroomId);
        console.log(`👥 User ${socket.userId} joined chat room: ${chatroomId}`);
    });

    // ออกจากห้องแชท
    socket.on('leaveRoom', (chatroomId) => {
        socket.leave(chatroomId);
        console.log(`👋 User ${socket.userId} left chat room: ${chatroomId}`);
    });

    // ส่งข้อความแบบ real-time
    socket.on('sendMessage', (data) => {
        console.log('📨 Broadcasting message to chat:', data.chatroomId);
        socket.to(data.chatroomId).emit('newMessage', {
            message: data.message,
            chatroomId: data.chatroomId
        });
    });

    // การพิมพ์
    socket.on('typing', (data) => {
        socket.to(data.chatroomId).emit('userTyping', {
            userId: socket.userId,
            isTyping: data.isTyping
        });
    });

    // การอ่านข้อความ
    socket.on('messageRead', async (data) => {
        try {
            console.log('📖 Message read event received:', data);
            console.log('📖 Broadcasting to chatroom:', data.chatroomId);
            console.log('📖 Read by user:', data.userId);
            
            // อัพเดทฐานข้อมูลให้ข้อความของคนอื่นถูกมาร์คว่าผู้ใช้ปัจจุบันอ่านแล้ว
            const Messages = require('./models/MessagesModel');
            const updateResult = await Messages.updateMany(
                { 
                    chat_id: data.chatroomId,
                    user_id: { $ne: data.userId }, // ข้อความของคนอื่น
                    'readBy.user': { $ne: data.userId } // ยังไม่ได้อ่านโดยผู้ใช้ปัจจุบัน
                },
                { 
                    $push: { 
                        readBy: { 
                            user: data.userId, 
                            readAt: new Date() 
                        } 
                    }
                }
            );
            
            console.log('✅ Messages marked as read in database, updated:', updateResult.modifiedCount);
            
            // ส่งการแจ้งเตือนการอ่านข้อความไปยังคนอื่นในห้องแชทเฉพาะเมื่อมีข้อความที่ถูกอ่านจริงๆ
            if (updateResult.modifiedCount > 0) {
                socket.to(data.chatroomId).emit('messageRead', {
                    chatroomId: data.chatroomId,
                    readBy: data.userId,
                    timestamp: new Date()
                });
                console.log('✅ MessageRead event broadcasted to chatroom');
            } else {
                console.log('📖 No unread messages from others, skipping messageRead event');
            }
        } catch (error) {
            console.error('❌ Error handling messageRead event:', error);
        }
    });

    // แจ้งเตือนแบบ real-time
    socket.on('sendNotification', (notificationData) => {
        const recipientSocketId = activeUsers.get(notificationData.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveNotification', notificationData);
        }
    });

    // เมื่อผู้ใช้ออกจากระบบ
    socket.on('disconnect', async () => {
        console.log('👋 User disconnected:', socket.id);
        
        if (socket.userId) {
            try {
                activeUsers.delete(socket.userId);
                
                // อัพเดทสถานะออฟไลน์
                const User = require('./models/UserModel');
                await User.findByIdAndUpdate(socket.userId, {
                    isOnline: false,
                    lastSeen: new Date()
                });

                console.log(`❌ User ${socket.userId} is now offline`);
                
                // แจ้งผู้ใช้อื่นว่าผู้ใช้นี้ออฟไลน์
                socket.broadcast.emit('user_offline', socket.userId);
            } catch (error) {
                console.error('❌ Error updating user offline status:', error);
            }
        }
    });
});

// เพิ่ม socket.io instance ให้ routes สามารถใช้ได้
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ทำให้ io instance เข้าถึงได้จาก app
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'ChatApp Backend is running!',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'ChatApp Backend API',
        version: '2.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            chats: '/api/chats',
            groups: '/api/groups',
            notifications: '/api/notifications',
            health: '/api/health'
        }
    });
});

// Error Handling Middleware
app.use(errorHandler);

// Handle unhandled routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO server running`);
    console.log(`🌐 Environment: ${NODE_ENV}`);
    console.log(`🔗 CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`📱 Expo Development Support: ${NODE_ENV === 'development' ? 'Enabled' : 'Limited'}`);
    console.log(`🌍 Server URL: ${NODE_ENV === 'production' ? 'https://realproject-mg25.onrender.com' : `http://localhost:${PORT}`}`);
});