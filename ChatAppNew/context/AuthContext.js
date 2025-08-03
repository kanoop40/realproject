import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../service/notificationService';
import { wakeUpServer } from '../service/healthCheck';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Wake up server ก่อนโหลดข้อมูล user
      console.log('🏥 Starting health check...');
      wakeUpServer(); // ไม่รอผลลัพธ์ ให้ทำงานพื้นหลัง
      
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
        
        // อัปเดต NotificationService ด้วยข้อมูลผู้ใช้ที่โหลดมา
        NotificationService.setCurrentUser(userData);
        
        // ตรวจสอบว่ามี currentUser หรือไม่ ถ้าไม่มีให้เพิ่ม
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (!currentUserStr) {
          console.log('🔄 AuthContext: Adding currentUser key for socket compatibility');
          await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, token) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      // เพิ่มการบันทึกด้วย key ที่ SocketContext ใช้หา
      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
      console.log('💾 AuthContext: Saved user data with both keys (userData & currentUser)');
      setUser(userData);
      
      // อัปเดต NotificationService ด้วยข้อมูลผู้ใช้ใหม่
      NotificationService.setCurrentUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('currentUser');
      console.log('🗑️ AuthContext: Removed all user data');
      
      // ล้างข้อมูลจาก NotificationService
      NotificationService.clearCurrentUser();
      
      setUser(null);
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);