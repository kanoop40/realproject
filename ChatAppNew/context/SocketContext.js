import React, { createContext, useContext, useEffect, useState } from 'react';
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
      console.log('🔄 SocketContext: Socket.io DISABLED for Render stability');
      console.log('📡 Using Pure HTTP API + Smart Heartbeat approach');
      console.log('💡 Modern Chat Solution: HTTP-based like WhatsApp Web');
      
      // ปิด Socket.io เพื่อหลีกเลี่ยง 502 errors จาก Render
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
      
      return;
    } catch (error) {
      console.error('❌ SocketContext error:', error);
      setSocket(null);
      setIsConnected(false);
    }
  };

  const disconnectSocket = () => {
    console.log('🔌 Socket disconnect (disabled) - using HTTP API only');
    setSocket(null);
    setIsConnected(false);
    setOnlineUsers([]);
  };

  const joinChatroom = (chatroomId) => {
    console.log('🏠 Join chatroom (HTTP-based):', chatroomId);
    // No socket - using HTTP API + useFocusEffect refresh
  };

  const leaveChatroom = (chatroomId) => {
    console.log('🚪 Leave chatroom (HTTP-based):', chatroomId);
    // No socket - using HTTP API + useFocusEffect refresh
  };

  const sendMessage = (chatroomId, message) => {
    console.log('📤 Send message (HTTP-based):', chatroomId);
    // No socket - using HTTP API + Smart Heartbeat
  };

  useEffect(() => {
    console.log('🚀 SocketContext: Initializing Modern HTTP-based Chat System');
    initSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  const value = {
    socket: null, // Always null - HTTP-based approach
    onlineUsers: [], // Empty - not using real-time presence
    isConnected: false, // Always false - no socket connection
    joinChatroom,
    leaveChatroom, 
    sendMessage,
    disconnectSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;