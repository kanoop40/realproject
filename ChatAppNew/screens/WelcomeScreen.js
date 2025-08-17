import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import InlineLoadingScreen from '../components/InlineLoadingScreen';
import useProgressLoading from '../hooks/useProgressLoading';

const WelcomeScreen = ({ navigation }) => {
  const { user, loading } = useAuth();
  const { isLoading, progress, startLoading, updateProgress, stopLoading } = useProgressLoading();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    // เริ่มต้นการโหลดแบบไม่แสดง UI loading
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('🔑 Found existing session for:', user.firstName, user.lastName);
        
        // นำทางตาม role ทันที
        if (user.role === 'admin') {
          navigation.replace('Admin');
        } else {
          navigation.replace('Chat');
        }
        return;
      }
      
      console.log('❌ No existing session found');
      // ถ้าไม่มี session ให้อยู่ที่ WelcomeScreen
    } catch (error) {
      console.error('Error checking session:', error);
      // ถ้า error ให้อยู่ที่ WelcomeScreen
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

  // ไม่แสดง loading เต็มหน้า ให้นำทางไปหน้า Chat ทันที
  // if (loading || isLoading) {
  //   return (
  //     <InlineLoadingScreen
  //       isVisible={loading || isLoading}
  //       progress={progress}
  //       title="LOADING"
  //       subtitle="กรุณารอสักครู่"
  //       backgroundColor="#F5C842"
  //     />
  //   );
  // }

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