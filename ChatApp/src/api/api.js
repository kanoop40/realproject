import axios from 'axios';

const api = axios.create({
  baseURL: 'http://<YOUR_BACKEND_IP>:5000/api' // เปลี่ยนให้ตรงกับ backend จริง
});

export default api;