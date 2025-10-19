import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../service/api';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
// Removed styles import - now using Tailwind CSS

const LoginScreen = ({ navigation }) => {
  const { login: authLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('🔐 Attempting login with:', { username });

      const response = await login(username, password);
      console.log('✅ Login successful:', response.data);

      // เก็บข้อมูลผู้ใช้และ token  
      const userData = response.data;
      
      // ใช้ AuthContext สำหรับ login
      await authLogin(userData, userData.token);
      console.log('✅ AuthContext updated with user data');

      // นำทางตาม role
      if (userData.role === 'admin') {
        navigation.replace('Admin');
      } else {
        navigation.replace('Chat');
      }
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'เข้าสู่ระบบล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <LoadingOverlay 
        visible={isLoading} 
        message="กำลังเข้าสู่ระบบ..." 
      />
      
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 30, fontWeight: 'bold', textAlign: 'center', color: '#000000', marginBottom: 32 }}>
          เข้าสู่ระบบ
          <Image
          source={require('../assets/logo.png')}
          style={{ width: 50, height: 50, marginBottom: 10 }}
          resizeMode="contain"
        />
        </Text>

        {error ? (
          <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        ) : null}

        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Username</Text>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: '#d1d5db', 
                borderRadius: 8, 
                paddingHorizontal: 16, 
                paddingVertical: 12, 
                fontSize: 16, 
                backgroundColor: '#ffffff' 
              }}
              placeholder="กรอก Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError('');
              }}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View>
            <Text style={{ color: '#374151', fontWeight: '500', marginBottom: 8 }}>Password</Text>
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: '#d1d5db', 
                borderRadius: 8, 
                paddingHorizontal: 16, 
                paddingVertical: 12, 
                fontSize: 16, 
                backgroundColor: '#ffffff' 
              }}
              placeholder="กรอก Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={{ 
              paddingVertical: 16, 
              borderRadius: 8, 
              marginTop: 24, 
              backgroundColor: isLoading ? '#9ca3af' : '#fad507f3' 
            }}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={{ color: '#14028de3', textAlign: 'center', fontSize: 18, fontWeight: '600' }}>
              เข้าสู่ระบบ
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Removed StyleSheet - now using Tailwind CSS classes

export default LoginScreen;