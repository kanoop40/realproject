// SSE (Server-Sent Events) สำหรับ real-time messaging
// แทนที่ Socket.io

const express = require('express');

class SSEManager {
  constructor() {
    this.connections = new Map(); // userId -> response object
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.roomUsers = new Map(); // roomId -> Set of userIds
  }

  // เพิ่ม connection ใหม่
  addConnection(userId, res) {
    console.log('📡 SSE: User connected:', userId);
    
    // ลบ connection เก่า (ถ้ามี)
    if (this.connections.has(userId)) {
      const oldRes = this.connections.get(userId);
      try {
        oldRes.end();
      } catch (err) {
        console.log('⚠️ Error closing old connection:', err.message);
      }
    }

    this.connections.set(userId, res);
    
    // ส่งข้อความ connected
    this.sendToUser(userId, {
      type: 'connected',
      timestamp: new Date().toISOString()
    });

    // Cleanup เมื่อ connection ปิด
    res.on('close', () => {
      console.log('📡 SSE: User disconnected:', userId);
      this.removeConnection(userId);
    });

    res.on('error', (err) => {
      console.log('📡 SSE Error for user', userId, ':', err.message);
      this.removeConnection(userId);
    });
  }

  // ลบ connection
  removeConnection(userId) {
    this.connections.delete(userId);
    
    // ลบออกจากทุกห้อง
    if (this.userRooms.has(userId)) {
      const rooms = this.userRooms.get(userId);
      rooms.forEach(roomId => {
        this.leaveRoom(userId, roomId);
      });
    }
  }

  // เข้าร่วมห้อง
  joinRoom(userId, roomId) {
    console.log('🏠 SSE: User', userId, 'joining room:', roomId);
    
    // เพิ่ม user เข้าห้อง
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomId);

    // เพิ่มห้องเข้า user
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Set());
    }
    this.roomUsers.get(roomId).add(userId);

    // ส่งข้อความยืนยัน
    this.sendToUser(userId, {
      type: 'room_joined',
      roomId: roomId,
      timestamp: new Date().toISOString()
    });
  }

  // ออกจากห้อง
  leaveRoom(userId, roomId) {
    console.log('🚪 SSE: User', userId, 'leaving room:', roomId);
    
    // ลบ user จากห้อง
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(roomId);
    }

    // ลบห้องจาก user
    if (this.roomUsers.has(roomId)) {
      this.roomUsers.get(roomId).delete(userId);
      
      // ลบห้องถ้าไม่มี user
      if (this.roomUsers.get(roomId).size === 0) {
        this.roomUsers.delete(roomId);
      }
    }
  }

  // ส่งข้อความไปยัง user คนหนึ่ง
  sendToUser(userId, data) {
    const connection = this.connections.get(userId);
    if (connection && !connection.destroyed) {
      try {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        connection.write(message);
        return true;
      } catch (err) {
        console.log('❌ Error sending to user', userId, ':', err.message);
        this.removeConnection(userId);
        return false;
      }
    }
    return false;
  }

  // ส่งข้อความไปยังห้อง
  sendToRoom(roomId, data, excludeUserId = null) {
    console.log('📢 SSE: Broadcasting to room', roomId, ', exclude:', excludeUserId);
    
    const users = this.roomUsers.get(roomId);
    if (!users) {
      console.log('⚠️ Room not found:', roomId);
      return 0;
    }

    let successCount = 0;
    users.forEach(userId => {
      if (userId !== excludeUserId) {
        if (this.sendToUser(userId, data)) {
          successCount++;
        }
      }
    });

    console.log(`📡 Sent to ${successCount}/${users.size} users in room ${roomId}`);
    return successCount;
  }

  // ดู users ที่ online
  getOnlineUsers() {
    return Array.from(this.connections.keys());
  }

  // ดู users ในห้อง
  getRoomUsers(roomId) {
    const users = this.roomUsers.get(roomId);
    return users ? Array.from(users) : [];
  }

  // ส่งข้อความไปยังทุกคน
  broadcast(data, excludeUserId = null) {
    console.log('📡 SSE: Broadcasting to all users, exclude:', excludeUserId);
    
    let successCount = 0;
    this.connections.forEach((connection, userId) => {
      if (userId !== excludeUserId) {
        if (this.sendToUser(userId, data)) {
          successCount++;
        }
      }
    });

    console.log(`📡 Broadcasted to ${successCount}/${this.connections.size} users`);
    return successCount;
  }

  // ส่งการแจ้งเตือน
  sendNotification(userId, notification) {
    return this.sendToUser(userId, {
      type: 'notification',
      notification: notification,
      timestamp: new Date().toISOString()
    });
  }

  // ส่งข้อความใหม่
  sendNewMessage(roomId, message, excludeUserId = null) {
    return this.sendToRoom(roomId, {
      type: 'new_message',
      message: message,
      chatroomId: roomId,
      timestamp: new Date().toISOString()
    }, excludeUserId);
  }

  // ส่งสถานะ typing
  sendTypingStatus(roomId, userId, isTyping, userName) {
    return this.sendToRoom(roomId, {
      type: 'user_typing',
      userId: userId,
      userName: userName,
      isTyping: isTyping,
      chatroomId: roomId,
      timestamp: new Date().toISOString()
    }, userId); // ไม่ส่งกลับไปหา user ที่พิมพ์
  }

  // ส่งสถานะการอ่านข้อความ
  sendMessageRead(roomId, userId) {
    return this.sendToRoom(roomId, {
      type: 'message_read',
      userId: userId,
      chatroomId: roomId,
      timestamp: new Date().toISOString()
    }, userId);
  }

  // ดูสถิติ
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.roomUsers.size,
      onlineUsers: this.getOnlineUsers(),
      rooms: Object.fromEntries(
        Array.from(this.roomUsers.entries()).map(([roomId, users]) => [
          roomId, 
          Array.from(users)
        ])
      )
    };
  }
}

// สร้าง SSE Manager instance
const sseManager = new SSEManager();

// SSE Routes
const setupSSERoutes = (app) => {
  
  // SSE Connection endpoint
  app.get('/sse/connect/:userId', (req, res) => {
    const userId = req.params.userId;
    
    console.log('📡 SSE Connection request from user:', userId);
    
    // ตั้งค่า SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // เพิ่ม connection
    sseManager.addConnection(userId, res);
  });

  // Join room
  app.post('/sse/join-room', (req, res) => {
    const { userId, roomId } = req.body;
    
    if (!userId || !roomId) {
      return res.status(400).json({ error: 'userId and roomId required' });
    }

    sseManager.joinRoom(userId, roomId);
    res.json({ success: true, message: 'Joined room successfully' });
  });

  // Leave room
  app.post('/sse/leave-room', (req, res) => {
    const { userId, roomId } = req.body;
    
    if (!userId || !roomId) {
      return res.status(400).json({ error: 'userId and roomId required' });
    }

    sseManager.leaveRoom(userId, roomId);
    res.json({ success: true, message: 'Left room successfully' });
  });

  // Send typing status
  app.post('/sse/typing', (req, res) => {
    const { userId, roomId, isTyping, userName } = req.body;
    
    if (!userId || !roomId || typeof isTyping !== 'boolean') {
      return res.status(400).json({ error: 'userId, roomId, and isTyping required' });
    }

    const sent = sseManager.sendTypingStatus(roomId, userId, isTyping, userName);
    res.json({ success: true, sentTo: sent });
  });

  // Send message read status
  app.post('/sse/message-read', (req, res) => {
    const { userId, roomId } = req.body;
    
    if (!userId || !roomId) {
      return res.status(400).json({ error: 'userId and roomId required' });
    }

    const sent = sseManager.sendMessageRead(roomId, userId);
    res.json({ success: true, sentTo: sent });
  });

  // SSE Stats (for debugging)
  app.get('/sse/stats', (req, res) => {
    res.json(sseManager.getStats());
  });

  console.log('📡 SSE routes configured');
};

module.exports = {
  sseManager,
  setupSSERoutes
};