import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Fixed API URL
const API_URL = 'http://192.168.2.52:5000';

console.log('Environment:', { 
  isDevice: Constants.isDevice, 
  Platform: Platform.OS,
  executionEnvironment: Constants.executionEnvironment 
});
console.log('🎯 API will connect to:', API_URL);

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor สำหรับ debug
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Token added to request');
      } else {
        console.log('⚠️ No token found');
      }
      console.log(`🔄 Making ${config.method?.toUpperCase()} request to:`, config.url);
    } catch (error) {
      console.log('❌ Error getting token:', error.message || error);
    }
    return config;
  },
  (error) => {
    console.log('❌ Request interceptor error:', error.message || error);
    return Promise.reject(error);
  }
);

// Response interceptor สำหรับ debug
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response.status);
    return response;
  },
  async (error) => {
    console.log('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      try {
        console.log('🔐 Unauthorized - clearing token');
        await AsyncStorage.removeItem('userToken');
      } catch (storageError) {
        console.log('❌ Error clearing token:', storageError.message || storageError);
      }
    }
    return Promise.reject(error);
  }
);

// API Functions
export const login = (username, password) => {
  console.log('🔐 Login attempt:', { username });
  return api.post('/auth/login', { username, password });
};

export const checkAuthStatus = () => {
  console.log('🔍 Checking auth status...');
  return api.get('/auth/status');
};

export const searchUsers = (query) => {
  console.log('🔍 Searching users with query:', query);
  return api.get(`/users/search?q=${encodeURIComponent(query)}`);
};

export const getCurrentUser = () => {
  console.log('👤 Fetching current user...');
  return api.get('/auth/status');
};

export const getChatrooms = () => {
  console.log('💬 Fetching chatrooms...');
  return api.get('/chats');
};

export const createChatroom = (participants) => {
  console.log('💬 Creating chatroom with participants:', participants);
  return api.post('/chats', { participants });
};

export const createPrivateChat = async (participants) => {
  try {
    console.log('💬 Creating private chat with participants:', participants);
    const response = await api.post('/chats/private', {
      participants
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating private chat:', error);
    throw error;
  }
};

export const sendMessage = (chatroomId, message) => {
  console.log('📤 Sending message to chatroom:', chatroomId);
  return api.post(`/chats/${chatroomId}/messages`, { message });
};

export const getMessages = (chatroomId) => {
  console.log('📥 Fetching messages for chatroom:', chatroomId);
  return api.get(`/chats/${chatroomId}/messages`);
};

export const updateProfile = (userData) => {
  console.log('👤 Updating profile:', Object.keys(userData));
  return api.put('/users/profile', userData);
};

export const uploadAvatar = (formData) => {
  console.log('🖼️ Uploading avatar...');
  return api.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Health check function
export const checkHealth = () => {
  console.log('🏥 Checking server health...');
  return api.get('/auth/health');
};

// Users API
export const getUsers = () => {
  console.log('👥 Fetching all users...');
  return api.get('/users');
};

export const getUserById = (userId) => {
  console.log('👤 Fetching user by ID:', userId);
  return api.get(`/users/${userId}`);
};

export const updateUser = (userId, userData) => {
  console.log('✏️ Updating user:', userId, Object.keys(userData));
  return api.put(`/users/${userId}`, userData);
};

export const deleteUser = (userId) => {
  console.log('🗑️ Deleting user:', userId);
  return api.delete(`/users/${userId}`);
};

// Notification functions
export const updatePushToken = (pushToken) => {
  console.log('🔔 Updating push token...');
  return api.post('/users/push-token', { pushToken });
};

export const getNotifications = () => {
  console.log('🔔 Fetching notifications...');
  return api.get('/notifications');
};

export const markNotificationAsRead = (notificationId) => {
  console.log('✅ Marking notification as read:', notificationId);
  return api.put(`/notifications/${notificationId}/read`);
};

export { API_URL };
export default api;
