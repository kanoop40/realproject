import api from './api';

// ดึงข้อมูลโปรไฟล์ (ต้องแนบ token ใน header)
export const getProfile = (token) =>
  api.get('/api/user/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });