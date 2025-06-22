const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

module.exports = (io) => {
  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.decoded = decoded;
        next();
      });
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.decoded.userId);

    // Join user to their personal room
    socket.join(socket.decoded.userId);

    // Join chat room
    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
    });

    // Handle new message
    socket.on('send_message', async (messageData) => {
      try {
        const newMessage = new Message({
          chat_id: messageData.chatId,
          user_id: socket.decoded.userId,
          content: messageData.content,
          file_id: messageData.fileId
        });

        await newMessage.save();

        // Broadcast message to chat room
        io.to(`chat_${messageData.chatId}`).emit('new_message', {
          ...newMessage.toObject(),
          user: socket.decoded
        });

        // Create notifications for other chat participants
        // Implementation here
      } catch (error) {
        console.error('Message error:', error);
      }
    });

    // Handle typing status
    socket.on('typing', (data) => {
      socket.to(`chat_${data.chatId}`).emit('user_typing', {
        userId: socket.decoded.userId,
        isTyping: data.isTyping
      });
    });

    // Handle read status
    socket.on('mark_read', async (messageId) => {
      try {
        const message = await Message.findById(messageId);
        if (message) {
          // Update read status
          // Implementation here
          io.to(`chat_${message.chat_id}`).emit('message_read', {
            messageId,
            userId: socket.decoded.userId
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.decoded.userId);
    });
  });



  
};