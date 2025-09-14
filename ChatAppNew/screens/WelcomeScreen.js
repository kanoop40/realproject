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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 192, height: 192, marginBottom: 48 }}
          resizeMode="contain"
        />

        {/* Login Button */}
        <TouchableOpacity 
          style={{ 
            width: '100%', 
            backgroundColor: '#3b82f6', 
            paddingVertical: 16, 
            paddingHorizontal: 24, 
            borderRadius: 8, 
            marginBottom: 16 
          }}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: '#ffffff', textAlign: 'center', fontSize: 18, fontWeight: '600' }}>
            Login
          </Text>
        </TouchableOpacity>

        {/* Debug: Clear Session Button */}
        <TouchableOpacity 
          style={{ 
            width: '100%', 
            backgroundColor: '#ef4444', 
            paddingVertical: 12, 
            paddingHorizontal: 24, 
            borderRadius: 8 
          }}
          onPress={clearSession}
        >
          <Text style={{ color: '#ffffff', textAlign: 'center', fontSize: 14 }}>
            🗑️ Clear Session (Debug)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Removed StyleSheet - now using Tailwind CSS classes

export default WelcomeScreen;