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
        'https://localhost:19006',
        'http://b1s-ely-anonymous-8081.exp.direct',
        'https://b1s-ely-anonymous-8081.exp.direct'
    ];

// Socket.IO configuration with environment-based CORS
const io = socketIo(server, {
    cors: {
        origin: NODE_ENV === 'production' ? ALLOWED_ORIGINS : "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS middleware - อนุญาตทุก origin ใน development
app.use(cors({
    origin: NODE_ENV === 'production' ? ALLOWED_ORIGINS : "*",
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

// CORS configuration with environment-based origins
app.use(cors({
    origin: NODE_ENV === 'production' ? ALLOWED_ORIGINS : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));

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

io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

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
    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`👥 User ${socket.userId} joined chat room: ${chatId}`);
    });

    // ออกจากห้องแชท
    socket.on('leave_chat', (chatId) => {
        socket.leave(chatId);
        console.log(`👋 User ${socket.userId} left chat room: ${chatId}`);
    });

    // ส่งข้อความแบบ real-time
    socket.on('send_message', (messageData) => {
        console.log('📨 Broadcasting message to chat:', messageData.chatId);
        socket.to(messageData.chatId).emit('receive_message', messageData);
    });

    // การพิมพ์
    socket.on('typing', (data) => {
        socket.to(data.chatId).emit('user_typing', {
            userId: socket.userId,
            isTyping: data.isTyping
        });
    });

    // การอ่านข้อความ
    socket.on('message_read', (data) => {
        socket.to(data.chatId).emit('message_read_update', {
            messageId: data.messageId,
            readBy: data.readBy
        });
    });

    // แจ้งเตือนแบบ real-time
    socket.on('send_notification', (notificationData) => {
        const recipientSocketId = activeUsers.get(notificationData.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receive_notification', notificationData);
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
});