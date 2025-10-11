import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../service/notificationService';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const currentUserRef = useRef(null);
  const currentChatroomRef = useRef(null);

  // ฟังก์ชันที่ไม่ทำอะไร (placeholder เพื่อไม่ให้ error)
  const joinChatroom = (chatroomId) => {
    console.log('📍 Setting current chatroom:', chatroomId);
  };

  const leaveChatroom = (chatroomId) => {
    console.log('📍 Leaving chatroom:', chatroomId);
  };

  const sendTyping = (chatroomId, isTyping) => {
    // ไม่ทำอะไร - ไม่มี real-time typing
  };

  const setCurrentChatroom = (chatroomId) => {
    console.log('📍 Setting current chatroom:', chatroomId);
    currentChatroomRef.current = chatroomId;
  };

  const clearCurrentChatroom = () => {
    console.log('📍 Clearing current chatroom');
    currentChatroomRef.current = null;
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

  // ฟังก์ชัน reconnect (ไม่ทำอะไร)
  const reconnectSSE = () => {
    console.log('No real-time connection to reconnect');
  };

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
          console.log('👤 User initialized:', userData.firstName);
        }
      } catch (error) {
        console.error('❌ User initialization error:', error);
      }
    };

    initializeUser();
  }, []);

  const value = {
    // Connection state (always true since no real connection)
    isConnected: true,
    onlineUsers: [],
    
    // Room management (placeholder functions)
    joinChatroom,
    leaveChatroom,
    setCurrentChatroom,
    clearCurrentChatroom,
    
    // Messaging (placeholder)
    sendTyping,
    
    // Notifications
    notifications,
    unreadCount,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    markAllAsRead,
    
    // Connection management (placeholder)
    reconnectSSE
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;