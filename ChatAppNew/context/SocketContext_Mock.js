import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // สร้าง mock socket object
  const [socket] = useState({
    connected: true,
    id: 'mock-socket-id',
    on: () => {},
    off: () => {},
    emit: () => {},
    connect: () => {},
    disconnect: () => {}
  });
  
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const currentUserRef = useRef(null);
  const currentChatroomRef = useRef(null);

  // Initialize user data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          currentUserRef.current = userData;
          
          // ตั้งค่า NotificationService
          NotificationService.setCurrentUser(userData);
          console.log('👤 Socket: User initialized:', userData.firstName);
        }
      } catch (error) {
        console.error('❌ Socket: User initialization error:', error);
      }
    };

    initializeUser();
  }, []);

  // Placeholder functions
  const joinChatroom = (chatroomId) => {
    console.log('🏠 Mock: Joining chatroom:', chatroomId);
  };

  const leaveChatroom = (chatroomId) => {
    console.log('🏠 Mock: Leaving chatroom:', chatroomId);
  };

  const setCurrentChatroom = (chatroomId) => {
    console.log('📍 Mock: Setting current chatroom:', chatroomId);
    currentChatroomRef.current = chatroomId;
  };

  const clearCurrentChatroom = () => {
    console.log('📍 Mock: Clearing current chatroom');
    currentChatroomRef.current = null;
  };

  const sendTyping = (chatroomId, isTyping) => {
    console.log(`⌨️ Mock: Typing ${isTyping ? 'started' : 'stopped'} in room:`, chatroomId);
  };

  const reconnectSocket = () => {
    console.log('🔄 Mock: Reconnect requested');
    setIsConnected(true);
  };

  // เพิ่ม notification
  const addNotification = (notification) => {
    const notificationWithId = {
      ...notification,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [notificationWithId, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // มาร์คว่าอ่านแล้ว
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ล้าง notifications
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // มาร์คทั้งหมดว่าอ่านแล้ว
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const value = {
    socket,
    onlineUsers,
    isConnected,
    joinChatroom,
    leaveChatroom,
    setCurrentChatroom,
    clearCurrentChatroom,
    sendTyping,
    reconnectSocket,
    notifications,
    unreadCount,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    markAllAsRead
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;