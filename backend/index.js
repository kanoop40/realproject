const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// เรียกใช้ dotenv เพื่อให้สามารถอ่านค่าจากไฟล์ .env ได้
dotenv.config();

// เชื่อมต่อกับ MongoDB
connectDB();

const app = express();

// ทำให้ Express สามารถอ่านข้อมูลแบบ JSON จาก body ของ request ได้
app.use(express.json());

// Route หลักสำหรับทดสอบ
app.get('/', (req, res) => {
    res.send('API is running...');
});

// นำ User Routes เข้ามาใช้ โดยให้มี prefix เป็น /api/users
app.use('/api/users', userRoutes);

// ใช้ Error Middleware ที่เราสร้างขึ้น
// ต้องอยู่หลังจาก app.use(routes) เสมอ
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);