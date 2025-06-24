const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const { errorHandler } = require('./Middleware/errorMiddleware');

dotenv.config();
const app = express();

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
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

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));