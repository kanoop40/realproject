import axios from 'axios';

const API_BASE = "http://192.168.1.34:5000/api"; // ใส่ IP จริงที่รัน backend

export const login = (data) =>
  axios.post(`${API_BASE}/auth/login`, data);