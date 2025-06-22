const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Map to store active users
const activeUsers = new Map();
// Map to store typing status
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.username);
    
    // Add user to active users
    activeUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      lastSeen: new Date()
    });

    // Broadcast user online status
    io.emit('user_status', {
      userId: socket.user._id,
      status: 'online',
      timestamp: new Date()
    });

    // Join user's chats
    socket.on('join_chats', (chatIds) => {
      chatIds.forEach(chatId => {
        socket.join(`chat_${chatId}`);
      });
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      const { chatId, content, fileId, replyToId } = data;
      
      try {
        // Create new message in database
        const newMessage = await Message.create({
          chat_id: chatId,
          user_id: socket.user._id,
          content,
          file_id: fileId,
          replyTo: replyToId
        });

        // Populate message details
        const message = await Message.findById(newMessage._id)
          .populate('user_id', 'firstName lastName avatar')
          .populate('file_id')
          .populate('replyTo');

        // Update chat's last message
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: newMessage._id
        });

        // Emit message to chat room
        io.to(`chat_${chatId}`).emit('new_message', {
          message,
          timestamp: new Date()
        });

        // Send notifications to offline users
        const chat = await Chat.findById(chatId)
          .populate('user_id');

        chat.user_id.forEach(user => {
          if (user._id.toString() !== socket.user._id.toString()) {
            const userSocket = activeUsers.get(user._id.toString());
            if (!userSocket) {
              // Create notification for offline user
              // This will be handled by the notification system
              io.to(`user_${user._id}`).emit('notification', {
                type: 'new_message',
                chatId,
                message
              });
            }
          }
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to send message',
          error: error.message
        });
      }
    });

    // Handle typing status
    socket.on('typing_start', (chatId) => {
      const roomKey = `${chatId}:${socket.user._id}`;
      
      if (!typingUsers.has(roomKey)) {
        typingUsers.set(roomKey, {
          userId: socket.user._id,
          username: socket.user.username,
          timestamp: new Date()
        });

        io.to(`chat_${chatId}`).emit('typing_update', {
          chatId,
          users: Array.from(typingUsers.entries())
            .filter(([key]) => key.startsWith(chatId))
            .map(([_, value]) => value)
        });
      }
    });

    socket.on('typing_end', (chatId) => {
      const roomKey = `${chatId}:${socket.user._id}`;
      
      if (typingUsers.has(roomKey)) {
        typingUsers.delete(roomKey);

        io.to(`chat_${chatId}`).emit('typing_update', {
          chatId,
          users: Array.from(typingUsers.entries())
            .filter(([key]) => key.startsWith(chatId))
            .map(([_, value]) => value)
        });
      }
    });

    // Handle read receipts
    socket.on('mark_read', async ({ chatId, messageIds }) => {
      try {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            chat_id: chatId
          },
          {
            $addToSet: {
              readBy: {
                user: socket.user._id,
                time: new Date()
              }
            }
          }
        );

        io.to(`chat_${chatId}`).emit('messages_read', {
          chatId,
          userId: socket.user._id,
          messageIds,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to mark messages as read',
          error: error.message
        });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.username);
      
      // Update user's last seen
      User.findByIdAndUpdate(socket.user._id, {
        lastSeen: new Date()
      }).exec();

      // Remove from active users
      activeUsers.delete(socket.user._id.toString());

      // Broadcast offline status
      io.emit('user_status', {
        userId: socket.user._id,
        status: 'offline',
        timestamp: new Date()
      });
    });
  });

  return io;
};

module.exports = initializeSocket;