// Middleware สำหรับจัดการกับ Route ที่ไม่มีอยู่จริง (404 Not Found)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Middleware สำหรับจัดการ Error ทั้งหมดที่เกิดขึ้นใน Application
const errorHandler = (err, req, res, next) => {
    // บางครั้ง Error อาจจะมาพร้อมกับ status code 200 OK ซึ่งไม่ถูกต้อง
    // ถ้าเป็นแบบนั้น ให้เปลี่ยนเป็น 500 Internal Server Error แทน
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        // แสดง stack trace เฉพาะตอนที่อยู่ในโหมด development เพื่อความปลอดภัย
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { notFound, errorHandler };