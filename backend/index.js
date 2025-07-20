const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { errorHandler } = require('./Middleware/errorMiddleware');

dotenv.config();
const app = express();

app.use(express.json());

// Serve static files (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://punchkan2547:kanoop60@cluster0.pco8lhg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoUri)
    .then(async () => {
        console.log('MongoDB Connected Successfully');
        
        // ทดสอบการเชื่อมต่อ
        try {
            const User = require('./models/UserModel');
            const testConnection = await User.findOne();
            console.log('Database connection test:', testConnection ? 'Successful' : 'No users found');
        } catch (err) {
            console.error('Database test error:', err);
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));