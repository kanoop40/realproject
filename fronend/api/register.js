import api from './api';

// ต้องใส่ /api ตรงกับ backend!
export const register = (data) => api.post('/auth/register', data);
// ถ้า api.js มี baseURL เป็น /api แล้ว (ดูด้านล่าง) ให้ใช้แบบนี้