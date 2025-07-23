import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUser(userData);
        
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