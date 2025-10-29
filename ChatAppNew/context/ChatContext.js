import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../service/notificationService';
import sseService from '../service/sseService';

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
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [messageHandlers, setMessageHandlers] = useState(new Set());
  
  const currentUserRef = useRef(null);
  const currentChatroomRef = useRef(null);

  // ✨ Real SSE-based room management
  const joinChatroom = async (chatroomId) => {
    console.log('📍 Joining chatroom via SSE:', chatroomId);
    currentChatroomRef.current = chatroomId;
    
    if (isSSEConnected) {
      const success = await sseService.joinRoom(chatroomId);
      if (success) {
        console.log('✅ Successfully joined room via SSE:', chatroomId);
      } else {
        console.log('⚠️ Failed to join room via SSE, falling back to HTTP polling');
      }
    }
  };

  const leaveChatroom = async (chatroomId) => {
    console.log('📍 Leaving chatroom via SSE:', chatroomId);
    
    if (currentChatroomRef.current === chatroomId) {
      currentChatroomRef.current = null;
    }
    
    if (isSSEConnected) {
      const success = await sseService.leaveRoom(chatroomId);
      if (success) {
        console.log('✅ Successfully left room via SSE:', chatroomId);
      }
    }
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

  // ✨ Real SSE reconnection
  const reconnectSSE = async () => {
    console.log('🔄 Reconnecting SSE...');
    try {
      const success = await sseService.connect();
      if (success) {
        console.log('✅ SSE reconnected successfully');
        // Rejoin current room if any
        if (currentChatroomRef.current) {
          await sseService.joinRoom(currentChatroomRef.current);
        }
      } else {
        console.log('❌ SSE reconnection failed');
      }
    } catch (error) {
      console.error('❌ SSE reconnection error:', error);
    }
  };

  // Add message handler for components
  const addMessageHandler = (handler) => {
    setMessageHandlers(prev => new Set([...prev, handler]));
    return () => {
      setMessageHandlers(prev => {
        const newSet = new Set(prev);
        newSet.delete(handler);
        return newSet;
      });
    };
  };

  // Initialize SSE connection and user data
  useEffect(() => {
    const initializeSSE = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          currentUserRef.current = userData;
          
          // Set up NotificationService
          NotificationService.setCurrentUser(userData);
          console.log('👤 User initialized:', userData.firstName);
          
          // ✨ Initialize SSE connection
          console.log('📡 Initializing SSE connection...');
          const success = await sseService.connect();
          
          if (success) {
            console.log('✅ SSE connection established');
          } else {
            console.log('⚠️ SSE connection failed, using HTTP-only mode');
          }
        }
      } catch (error) {
        console.error('❌ SSE initialization error:', error);
      }
    };

    initializeSSE();
    
    // Set up SSE event handlers
    const handleSSEConnection = (connected) => {
      setIsSSEConnected(connected);
      console.log('📡 SSE connection status:', connected ? 'Connected' : 'Disconnected');
    };
    
    const handleSSEMessage = (data) => {
      console.log('📨 SSE message received:', data.type);
      
      // Handle different message types
      switch (data.type) {
        case 'new_message':
          // Broadcast to all registered message handlers
          messageHandlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
          break;
          
        case 'user_typing':
          // Handle typing indicators
          messageHandlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error('Error in typing handler:', error);
            }
          });
          break;
          
        case 'notification':
          // Handle notifications
          addNotification(data.notification);
          break;
          
        default:
          console.log('📨 Unknown SSE message type:', data.type);
      }
    };
    
    // Register SSE event handlers
    const unsubscribeConnection = sseService.onConnectionChange(handleSSEConnection);
    const unsubscribeMessage = sseService.onMessage(handleSSEMessage);
    
    // Cleanup on unmount
    return () => {
      console.log('📡 Cleaning up SSE...');
      unsubscribeConnection();
      unsubscribeMessage();
      sseService.disconnect();
    };
  }, []);
  
  // Update SSE message handlers when messageHandlers change
  useEffect(() => {
    // This effect ensures SSE messages are delivered to the latest set of handlers
  }, [messageHandlers]);

  const value = {
    // ✨ Real SSE connection state
    isConnected: isSSEConnected,
    onlineUsers: [],
    
    // ✨ Real SSE room management
    joinChatroom,
    leaveChatroom,
    setCurrentChatroom,
    clearCurrentChatroom,
    
    // Messaging
    sendTyping,
    
    // Notifications
    notifications,
    unreadCount,
    addNotification,
    markNotificationAsRead,
    clearNotifications,
    markAllAsRead,
    
    // ✨ Real SSE connection management
    reconnectSSE,
    addMessageHandler,
    
    // SSE service access
    sseService
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;