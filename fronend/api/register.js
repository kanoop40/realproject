import api from './api';

export const register = (data) =>
  api.post('/auth/register', data);