import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.34:5000'; // IP จริงของเครื่อง
// const API_URL = 'http://10.0.2.2:5000'; // สำหรับ Android Emulator
// const API_URL = 'http://localhost:5000'; // สำหรับ iOS Simulator

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to request header
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

export const login = (username, password) => {
  return api.post('/auth/login', { username, password });
};

export const checkAuthStatus = () => {
  return api.get('/auth/status');
};

export default api;