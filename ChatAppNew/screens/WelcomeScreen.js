import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { useAuth } from '../context/AuthContext';

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
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: 24 
      }}>
        {/* Background Community Animation */}
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <LottieView
            source={require('../assets/Community V2.json')}
            autoPlay
            loop={true}
            style={{ width: 375, height: 750 }}
          />
        </View>

        {/* Logo on top of animation */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
          
        </View>

        {/* Login Button */}
        <View style={{ width: '100%', paddingBottom: 50, zIndex: 1, alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ 
             
              width: '55%', 
              backgroundColor: '#fad507f3', 
              paddingVertical: 16, 
              paddingHorizontal: 24, 
              borderRadius: 12, 
              elevation: 3,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              
            }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ 
              color: '#14028de3', 
              textAlign: 'center', 
              fontSize: 18, 
              fontWeight: '600' 
            }}>
              เข้าสู่ระบบ
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};



export default WelcomeScreen;