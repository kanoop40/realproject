require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>console.log('MongoDB connected'))
  .catch(err=>console.error(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/group', require('./routes/group'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/group', require('./routes/group'));
app.use('/uploads', express.static('uploads'));
// Socket.IO
io.on('connection', (socket) => {
  console.log('a user connected');
  // handle join, message, read, etc.
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  // user join room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });

  // ส่งข้อความ
  socket.on('sendMessage', (data) => {
    // บันทึกลง DB ด้วย model Chat (optionally)
    // แจ้งไปยังทุกคนในห้อง
    io.to(data.chatRoom).emit('receiveMessage', data);
  });
});