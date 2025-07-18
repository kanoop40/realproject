import axios from 'axios';

const API_URL = 'http://10.0.2.2:5000'; // สำหรับ Android Emulator
// const API_URL = 'http://localhost:5000'; // สำหรับ iOS Simulator

const api = axios.create({
  baseURL: API_URL,
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
  return api.post('/api/auth/login', { username, password });
};

export const checkAuthStatus = () => {
  return api.get('/api/auth/status');
};

export default api;