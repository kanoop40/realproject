import axios from 'axios';
import { API_URL } from '../config';

export const getMessage = async (chatId, params = {}) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/messages/${chatId}`,
      { params }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'ไม่สามารถโหลดข้อความได้'
    );
  }
};

export const sendMessage = async (data) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/messages`,
      data
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'ไม่สามารถส่งข้อความได้'
    );
  }
};

export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `${API_URL}/api/files/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data._id;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'ไม่สามารถอัพโหลดไฟล์ได้'
    );
  }
};