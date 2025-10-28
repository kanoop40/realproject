import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../service/notificationService';
import { wakeUpServer } from '../service/healthCheck';
import keepAliveService from '../service/keepAliveService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Wake up server ก่อนโหลดข้อมูล user (ไม่รอผลลัพธ์)
      // console.log('🏥 Starting health check...');
      // wakeUpServer(); // ปิดชั่วคราวสำหรับ localhost testing
      
      // เริ่ม keep-alive service เพื่อป้องกัน cold start
      // keepAliveService.start(); // ปิดชั่วคราวสำหรับ localhost testing
      
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
        
        // อัปเดต NotificationService ด้วยข้อมูลผู้ใช้ที่โหลดมา
        NotificationService.setCurrentUser(userData);
        
        // ลงทะเบียน push notifications สำหรับ existing user
        try {
          console.log('🔔 AuthContext loadUser: Registering push notifications...');
          const pushToken = await NotificationService.registerForPushNotificationsAsync();
          
          if (pushToken) {
            console.log('🔔 AuthContext loadUser: Sending push token to backend');
            const api = require('../service/api').default;
            await api.post('/users/push-token', { 
              pushToken: pushToken 
            });
            console.log('✅ AuthContext loadUser: Push token updated successfully');
          }
        } catch (pushError) {
          console.error('🔔 AuthContext loadUser: Error with push notifications:', pushError);
          // ไม่ให้ push notification error ทำให้การโหลดข้อมูลล้มเหลว
        }
        
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
      // ตั้ง loading เป็น false ทันทีโดยไม่ต้องรอ
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
      
      // ลงทะเบียน push notifications และส่ง token ไปยัง backend
      try {
        console.log('🔔 AuthContext: Registering for push notifications...');
        const pushToken = await NotificationService.registerForPushNotificationsAsync();
        
        if (pushToken) {
          console.log('🔔 AuthContext: Sending push token to backend:', pushToken);
          // ส่ง push token ไปยัง backend
          const api = require('../service/api').default;
          await api.post('/users/push-token', { 
            pushToken: pushToken 
          });
          console.log('✅ AuthContext: Push token sent to backend successfully');
        }
      } catch (pushError) {
        console.error('🔔 AuthContext: Error with push notifications:', pushError);
        // ไม่ให้ push notification error ทำให้ login ล้มเหลว
      }
      
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      // หยุด keep-alive service เมื่อ logout
      keepAliveService.stop();
      
      // ล้างข้อมูลจาก NotificationService (รวมลบ token จาก backend)
      await NotificationService.clearCurrentUser();
      
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('currentUser');
      console.log('🗑️ AuthContext: Removed all user data');
      
      setUser(null);
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // ยังคง logout แม้จะมี error (เผื่อปัญหา network)
      setUser(นnull);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);