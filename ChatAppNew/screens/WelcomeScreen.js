import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
// Removed loading imports - no longer using loading functionality
// Removed styles import - now using Tailwind CSS

const WelcomeScreen = ({ navigation }) => {
  const { user, loading } = useAuth();
  // Removed loading hook - no longer using loading functionality

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    // ตรวจสอบ session แต่ไม่ auto-navigate
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('🔑 Found existing session for:', user.firstName, user.lastName);
        // ไม่ auto-navigate แล้ว ให้ผู้ใช้เลือกเองว่าจะไปหน้าไหน
      } else {
        console.log('❌ No existing session found');
      }
    } catch (error) {
      console.error('Error checking session:', error);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 200, height: 200, marginBottom: 10 }}
          resizeMode="contain"
        />

        

        {/* Login Button สำหรับ login ใหม่ */}
        <TouchableOpacity 
          style={{ 
            width: '100%', 
            backgroundColor: '#fad507f3', 
            paddingVertical: 16, 
            paddingHorizontal: 24, 
            borderRadius: 8, 
            marginBottom: 16 
          }}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: '#14028de3', textAlign: 'center', fontSize: 18,  }}>
            เข้าสู่ระบบ
          </Text>
        </TouchableOpacity>

       
        
      </View>
    </SafeAreaView>
  );
};



export default WelcomeScreen;