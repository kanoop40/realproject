const io = require('socket.io-client');

console.log('🧪 Testing Socket.IO connection to http://172.22.98.120:5000');

const socket = io('http://172.22.98.120:5000', {
  timeout: 10000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket connected successfully!');
  console.log('🆔 Socket ID:', socket.id);
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error.message);
  console.error('❌ Error type:', error.type || 'Unknown');
  process.exit(1);
});

setTimeout(() => {
  console.error('⏰ Connection timeout');
  process.exit(1);
}, 15000);
