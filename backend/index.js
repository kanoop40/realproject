const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
// const socketIo = require('socket.io'); // ลบ Socket.io
const { sseManager, setupSSERoutes } = require('./sse'); // เพิ่ม SSE

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
        'https://192.168.1.34:19006',
        // New IP addresses
        'exp://172.22.98.120:8081',
        'exp://172.22.98.120:8082',
        'http://172.22.98.120:8081',
        'http://172.22.98.120:8082',
        'https://172.22.98.120:8081',
        'https://172.22.98.120:8082',
        'http://172.22.98.120:19006',
        'https://172.22.98.120:19006',
        // Production URLs
        'https://realproject-mg25.onrender.com'
    ];

// ลบ Socket.IO configuration - ใช้ SSE แทน

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

// SSE Setup - แทนที่ Socket.IO
setupSSERoutes(app);

// เพิ่ม SSE manager ให้ routes สามารถใช้ได้
app.use((req, res, next) => {
    req.sseManager = sseManager;
    next();
});

// ทำให้ SSE manager เข้าถึงได้จาก app
app.set('sseManager', sseManager);

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
    console.log(`📡 SSE server running`);
    console.log(`🌐 Environment: ${NODE_ENV}`);
    console.log(`🔗 CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`📱 Expo Development Support: ${NODE_ENV === 'development' ? 'Enabled' : 'Limited'}`);
    console.log(`🌍 Server URL: ${NODE_ENV === 'production' ? 'https://realproject-mg25.onrender.com' : `http://localhost:${PORT}`}`);
});