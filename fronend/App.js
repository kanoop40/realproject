import axios from 'axios';

const API_BASE = "http://<your-backend-ip>:5000/api"; // แนะนำให้ใส่ IP แทน localhost เวลาเชื่อมจากมือถือ

export const login = (data) =>
  axios.post(`${API_BASE}/auth/login`, data);