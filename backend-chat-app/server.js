require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log('MongoDB connected'))
  .catch(err=>console.error(err));

// Routes
app.use('/api/user', require('./routes/profile'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/uploads', express.static('uploads'));
app.use('/api/group', require('./routes/group'));
app.use('/api/invite', require('./routes/invite'));
app.use('/api/log', require('./routes/log'));
app.use('/api/file', require('./routes/file'));
app.use('/api/notification', require('./routes/notification'));

// Socket.IO
io.on('connection', (socket) => {
  console.log('user connected:', socket.id);
  socket.on('joinRoom', (roomId) => socket.join(roomId));
  socket.on('sendMessage', (data) => {
    io.to(data.chatRoom).emit('receiveMessage', data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));