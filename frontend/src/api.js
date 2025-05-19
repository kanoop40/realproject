import axios from "axios";
const API_URL = "http://192.168.2.33:3000/api";// ถ้า backend รันบน server จริง เปลี่ยน URL นี้

export const register = (data) => axios.post(`${API_URL}/users/register`, data);
export const login = (data) => axios.post(`${API_URL}/users/login`, data);