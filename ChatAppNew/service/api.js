import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Development API URL (auto-detect)  
//const API_URL = 'http://192.168.2.54:5000'; // ใช้ IP เดียวกันทั้ง simulator และ device
const API_URL = 'https://realproject-mg25.onrender.com';
console.log('Environment:', { 
  isDevice: Constants.isDevice, 
  Platform: Platform.OS,
  executionEnvironment: Constants.executionEnvironment 
});
console.log('🎯 API will connect to:', API_URL);

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000, // เพิ่มเป็น 60 วินาทีสำหรับ file upload
  // ไม่ตั้ง default Content-Type ให้ axios จัดการเอง (สำหรับ FormData)
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
      
      // ตั้ง Content-Type เป็น JSON สำหรับ request ที่ไม่ใช่ FormData
      if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
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

// Response interceptor สำหรับ debug และ retry
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Retry สำหรับ timeout หรือ network error (สำหรับ cold start)
    if ((error.code === 'ECONNABORTED' || 
         error.message.includes('timeout') || 
         error.message.includes('Network Error')) && 
        !originalRequest._retry && 
        originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;
      console.log('🔄 Retrying request due to timeout/network error (cold start)...');
      
      // รอ 5 วินาที แล้ว retry สำหรับ file upload
      const isFileUpload = originalRequest.headers['Content-Type']?.includes('multipart/form-data');
      const waitTime = isFileUpload ? 8000 : 3000;
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return api(originalRequest);
    }
    
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
    
    // ลด timeout เหลือ 8 วินาที
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout - การสร้างแชทใช้เวลานานเกินไป')), 8000)
    );

    const apiPromise = api.post('/chats/private', {
      participants
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log('💬 Private chat API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('💬 Error creating private chat:', error.message);
    if (error.response) {
      console.error('💬 Response error details:', error.response.data);
    }
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

// Chat message functions
export const deleteMessage = (messageId) => {
  console.log('🗑️ Deleting message:', messageId);
  return api.delete(`/chats/messages/${messageId}`);
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

// Group API functions
export const createGroup = (groupData) => {
  console.log('➕ Creating group:', Object.keys(groupData));
  return api.post('/groups', groupData);
};

export const updateGroup = (groupId, groupData) => {
  console.log('✏️ Updating group:', groupId, Object.keys(groupData));
  return api.put(`/groups/${groupId}`, groupData);
};

export const updateGroupAvatar = (groupId, formData) => {
  console.log('🖼️ Updating group avatar:', groupId);
  return api.put(`/groups/${groupId}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000, // 3 นาทีสำหรับการอัพโหลดรูป
  });
};

export const addGroupMembers = (groupId, userIds) => {
  console.log('👥 Adding group members:', groupId, userIds);
  return api.post(`/groups/${groupId}/invite`, { userIds });
};

export const getGroupDetails = (groupId) => {
  console.log('📋 Getting group details:', groupId);
  return api.get(`/groups/${groupId}`);
};

export const removeGroupMember = (groupId, userId) => {
  console.log('🦵 Removing member from group:', groupId, userId);
  return api.delete(`/groups/${groupId}/members/${userId}`);
};

export const deleteGroup = (groupId) => {
  console.log('🗑️ Deleting group:', groupId);
  return api.delete(`/groups/${groupId}`);
};

export { API_URL };
export default api;
