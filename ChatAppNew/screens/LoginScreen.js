import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.2.38:5000';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ฟังก์ชันทดสอบ connection
  const testConnection = async () => {
    try {
      console.log('Testing connection to:', `${API_URL}/api/auth/health`);
      const response = await axios.get(`${API_URL}/api/auth/health`, { 
        timeout: 5000 
      });
      console.log('Connection test success:', response.data);
      Alert.alert('Connection Test', `Success: ${response.data.message}`);
    } catch (error) {
      console.log('Connection test failed:', error.message);
      Alert.alert('Connection Test Failed', `Error: ${error.message}`);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      console.log('Attempting login with:', { username, password });

      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });

      console.log('Login successful:', response.data);

      // เก็บข้อมูลผู้ใช้และ token
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));

      // นำทางตาม role
      if (response.data.role === 'admin') {
        navigation.replace('Admin');
      } else {
         navigation.replace('Chat'); // นำทางไปหน้า User สำหรับ role อื่นๆ
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      setError(error.response?.data?.message || 'เข้าสู่ระบบล้มเหลว');
      
      // ลบข้อมูลที่อาจจะมีการบันทึกไว้
      await AsyncStorage.multiRemove(['userToken', 'userData']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>เข้าสู่ระบบ</Text>

      
       
        
        
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>ชื่อผู้ใช้</Text>
            <TextInput
              style={styles.input}
              placeholder="กรอกชื่อผู้ใช้"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError('');
              }}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput
              style={styles.input}
              placeholder="กรอกรหัสผ่าน"
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
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30
  },
  form: {
    width: '100%'
  },
  inputWrapper: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  loginButtonDisabled: {
    opacity: 0.7
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  testButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  debugButton: {
    backgroundColor: '#ffc107',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10
  }
});

export default LoginScreen;