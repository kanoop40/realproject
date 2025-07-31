import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../service/api';
import NotificationService from '../service/notificationService';

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

  const initSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userString = await AsyncStorage.getItem('currentUser');
      
      console.log('🔄 SocketContext: Initializing socket connection...');
      console.log('🔑 Token exists:', !!token);
      console.log('👤 User data exists:', !!userString);
      
      if (!userString && token) {
        console.log('⚠️ No user data but token exists! Fetching user data...');
        try {
          // ดึงข้อมูล user จาก API
          const response = await fetch(`${API_URL}/api/users/current`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('✅ Fetched user data for socket:', userData.firstName, userData.lastName);
            
            // บันทึกข้อมูล user ลง AsyncStorage
            await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
            console.log('💾 Saved user data to AsyncStorage');
            
            // อัพเดท userString สำหรับใช้ต่อ
            const updatedUserString = JSON.stringify(userData);
            
            // เรียก initSocket อีกครั้งด้วยข้อมูลที่ถูกต้อง
            console.log('🔄 Reinitializing socket with user data...');
            return initSocket();
          } else {
            console.error('❌ Failed to fetch user data:', response.status);
            return;
          }
        } catch (fetchError) {
          console.error('❌ Error fetching user data:', fetchError);
          return;
        }
      }
      
      if (token && userString) {
        const user = JSON.parse(userString);
        console.log('👤 User for socket:', user.firstName, user.lastName, user._id);
        
        // อัพเดท NotificationService ด้วยข้อมูล user ที่ถูกต้อง
        NotificationService.setCurrentUser(user);
        console.log('🔔 Updated NotificationService with user:', user.firstName, user.lastName, user._id);
        
        const socketURL = API_URL.replace('/api', '');
        console.log('🌐 Connecting to socket URL:', socketURL);
        
        // เชื่อมต่อ Socket.IO
        const socketInstance = io(socketURL, {
          auth: {
            token: token,
            userId: user._id
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socketInstance.on('connect', () => {
          console.log('✅ Socket connected successfully!');
          console.log('🆔 Socket ID:', socketInstance.id);
          console.log('🔗 Connected to:', socketURL);
          setIsConnected(true);
          
          // ส่ง user ID หลังจาก connect สำเร็จ
          if (user._id) {
            console.log('👤 Emitting join event for user:', user._id);
            socketInstance.emit('join', user._id);
          }
        });

        socketInstance.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error.message);
          console.error('❌ Error details:', error);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', () => {
          console.log('❌ Socket disconnected');
          setIsConnected(false);
        });

        socketInstance.on('onlineUsers', (users) => {
          console.log('👥 Online users:', users);
          setOnlineUsers(users);
        });

        // Listen for notifications
        socketInstance.on('receiveNotification', async (notification) => {
          console.log('🔔 Received notification:', notification);
          
          // ใช้ NotificationService แทน
          await NotificationService.handleNewMessage(
            notification.message,
            notification.title.replace('ข้อความใหม่จาก ', ''),
            notification.chatroomId,
            notification.senderId
          );
        });

        // ฟัง new message เพื่อแสดง notification เมื่อไม่ได้อยู่ในแชท
        socketInstance.on('newMessage', async (data) => {
          console.log('🔔 SocketContext: New message received:', data);
          console.log('🔔 Message sender ID:', data.message.sender._id);
          console.log('🔔 Current user ID:', user._id);
          
          // ใช้ NotificationService เพื่อจัดการ notification
          const senderName = `${data.message.sender.firstName} ${data.message.sender.lastName}`;
          await NotificationService.handleNewMessage(
            data.message.content,
            senderName,
            data.chatroomId,
            data.message.sender._id
          );
        });

        // Listen for user online/offline status
        socketInstance.on('user_online', (userId) => {
          console.log('🟢 User came online:', userId);
        });

        socketInstance.on('user_offline', (userId) => {
          console.log('🔴 User went offline:', userId);
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

  useEffect(() => {
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

  // ฟังก์ชันสำหรับเชื่อมต่อใหม่
  const reconnectSocket = async () => {
    if (socket) {
      console.log('🔄 Disconnecting old socket...');
      socket.disconnect();
    }
    
    console.log('🔄 Attempting to reconnect socket...');
    await initSocket();
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    joinChatroom,
    leaveChatroom,
    sendMessage,
    sendTyping,
    reconnectSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
