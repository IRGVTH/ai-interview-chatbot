import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // URL ของ Backend เพื่อน
});

// ใส่ Token ใน Header อัตโนมัติถ้ามี Logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;