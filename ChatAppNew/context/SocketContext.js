import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userString = await AsyncStorage.getItem('currentUser');
        
        if (token && userString) {
          const user = JSON.parse(userString);
          
          // เชื่อมต่อ Socket.IO
          const socketInstance = io('http://192.168.2.38:5000', {
            auth: {
              token: token,
              userId: user._id
            },
            transports: ['websocket', 'polling']
          });

          socketInstance.on('connect', () => {
            console.log('✅ Socket connected:', socketInstance.id);
            setIsConnected(true);
          });

          socketInstance.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            setIsConnected(false);
          });

          socketInstance.on('onlineUsers', (users) => {
            console.log('👥 Online users:', users);
            setOnlineUsers(users);
          });

          socketInstance.on('error', (error) => {
            console.error('🔴 Socket error:', error);
          });

          setSocket(socketInstance);

          return () => {
            socketInstance.disconnect();
          };
        }
      } catch (error) {
        console.error('❌ Socket initialization error:', error);
      }
    };

    initSocket();
  }, []);

  // ฟังก์ชันสำหรับเข้าร่วมห้องแชท
  const joinChatroom = (chatroomId) => {
    if (socket) {
      console.log('🏠 Joining chatroom:', chatroomId);
      socket.emit('joinRoom', chatroomId);
    }
  };

  // ฟังก์ชันสำหรับออกจากห้องแชท
  const leaveChatroom = (chatroomId) => {
    if (socket) {
      console.log('🚪 Leaving chatroom:', chatroomId);
      socket.emit('leaveRoom', chatroomId);
    }
  };

  // ฟังก์ชันส่งข้อความ
  const sendMessage = (chatroomId, message) => {
    if (socket) {
      console.log('💬 Sending message via socket:', { chatroomId, message });
      socket.emit('sendMessage', {
        chatroomId,
        message
      });
    }
  };

  // ฟังก์ชันแจ้งว่ากำลังพิมพ์
  const sendTyping = (chatroomId, isTyping) => {
    if (socket) {
      socket.emit('typing', {
        chatroomId,
        isTyping
      });
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    joinChatroom,
    leaveChatroom,
    sendMessage,
    sendTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
