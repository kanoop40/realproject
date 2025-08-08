import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import ProgressLoadingScreen from '../components/ProgressLoadingScreen';
import useProgressLoading from '../hooks/useProgressLoading';

const WelcomeScreen = ({ navigation }) => {
  const { user, loading } = useAuth();
  const { isLoading, progress, startLoading, updateProgress, stopLoading } = useProgressLoading();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    startLoading();
    try {
      updateProgress(20); // เริ่มต้น 20%
      const token = await AsyncStorage.getItem('userToken');
      updateProgress(50); // 50% เมื่อได้ token
      
      const userData = await AsyncStorage.getItem('userData');
      updateProgress(80); // 80% เมื่อได้ user data
      
      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('🔑 Found existing session for:', user.firstName, user.lastName);
        
        updateProgress(90); // 90% เมื่อประมวลผลข้อมูล
        
        // นำทางตาม role โดยไม่ต้อง login ใหม่
        setTimeout(() => {
          updateProgress(100); // 100% เมื่อเสร็จสิ้น
          setTimeout(() => {
            if (user.role === 'admin') {
              navigation.replace('Admin');
            } else {
              navigation.replace('Chat');
            }
          }, 300);
        }, 200);
        return;
      }
      
      console.log('❌ No existing session found');
      updateProgress(100); // 100% แม้ไม่มี session
      stopLoading(300); // หยุด loading หลัง 300ms
    } catch (error) {
      console.error('Error checking session:', error);
      updateProgress(100); // 100% เมื่อ error
      stopLoading(300); // หยุด loading หลัง 300ms
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.clear();
      console.log('🗑️ All session data cleared');
      // รีเฟรช page
      checkExistingSession();
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  // แสดง loading หากกำลังตรวจสอบ auth
  if (loading || isLoading) {
    return (
      <ProgressLoadingScreen
        isVisible={loading || isLoading}
        progress={progress}
        title="กำลังตรวจสอบ..."
        subtitle="กรุณารอสักครู่"
        color="#FFB800"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Login Button */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>
            Login
          </Text>
        </TouchableOpacity>

        {/* Debug: Clear Session Button */}
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearSession}
        >
          <Text style={styles.clearButtonText}>
            🗑️ Clear Session (Debug)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5C842' // เปลี่ยนเป็นสีเหลือง
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#F5C842' // เปลี่ยนเป็นสีเหลือง
  },
  loadingText: {
    fontSize: 16,
    color: '#333', // เปลี่ยนเป็นสีเข้ม
    textAlign: 'center'
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20
  },
  loginButton: {
    backgroundColor: '#FFA500', // เปลี่ยนเป็นสีส้ม
    width: 150,
    paddingVertical: 12,
    borderRadius: 8
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18
  },
  clearButton: {
    backgroundColor: '#ff3b30',
    width: 200,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 20
  },
  clearButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14
  }
});

export default WelcomeScreen;