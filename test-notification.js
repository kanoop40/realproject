const io = require('socket.io-client');

// ทดสอบ real-time notifications
const testNotifications = async () => {
  console.log('🔔 Testing real-time notifications...');
  
  const socket1 = io('http://localhost:5000', {
    auth: {
      token: 'test-token-1',
      userId: 'user1'
    }
  });

  const socket2 = io('http://localhost:5000', {
    auth: {
      token: 'test-token-2', 
      userId: 'user2'
    }
  });

  socket1.on('connect', () => {
    console.log('✅ Socket 1 connected:', socket1.id);
  });

  socket2.on('connect', () => {
    console.log('✅ Socket 2 connected:', socket2.id);
  });

  // User 1 listen for notifications
  socket1.on('newMessage', (data) => {
    console.log('🔔 User 1 received notification:', data);
  });

  // User 2 listen for notifications
  socket2.on('newMessage', (data) => {
    console.log('🔔 User 2 received notification:', data);
  });

  // Join test chatroom
  setTimeout(() => {
    console.log('📝 Joining test chatroom...');
    socket1.emit('joinRoom', 'test-chatroom-123');
    socket2.emit('joinRoom', 'test-chatroom-123');
  }, 1000);

  // Send test message from user 1
  setTimeout(() => {
    console.log('📤 User 1 sending message...');
    socket1.emit('sendMessage', {
      chatroomId: 'test-chatroom-123',
      content: 'สวัสดีครับ! ทดสอบ notification',
      sender: {
        _id: 'user1',
        firstName: 'Test',
        lastName: 'User1'
      }
    });
  }, 2000);

  // Send test message from user 2
  setTimeout(() => {
    console.log('📤 User 2 sending message...');
    socket2.emit('sendMessage', {
      chatroomId: 'test-chatroom-123',
      content: 'สวัสดีครับ! ได้รับข้อความแล้ว',
      sender: {
        _id: 'user2', 
        firstName: 'Test',
        lastName: 'User2'
      }
    });
  }, 3000);

  // Disconnect after testing
  setTimeout(() => {
    console.log('🚪 Disconnecting sockets...');
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  }, 5000);
};

testNotifications().catch(console.error);