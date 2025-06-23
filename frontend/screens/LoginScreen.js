import React, { useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper'; // 1. นำเข้าคอมโพเนนท์จาก Paper
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:5000/api/users';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false); // State สำหรับซ่อน/แสดงรหัสผ่าน

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      const { token } = response.data;
      await AsyncStorage.setItem('userToken', token);

      Alert.alert('Success', `Welcome ${response.data.name}`);
      navigation.replace('Home');

    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message || 'Invalid email or password';
      Alert.alert('Login Failed', errorMessage);
    }
  };

  return (
    // 2. ใช้ View ธรรมดาและกำหนดสไตล์จาก StyleSheet
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        Login
      </Text>

      {/* 3. ใช้ TextInput ของ Paper */}
      <TextInput
        label="Email (รหัสนักศึกษา/พนักงาน)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        mode="outlined" // ทำให้มีขอบสวยงาม
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!passwordVisible} // ซ่อน/แสดงรหัสผ่าน
        style={styles.input}
        mode="outlined"
        // เพิ่มไอคอนรูปตาสำหรับกดดูรหัสผ่าน
        right={<TextInput.Icon icon={passwordVisible ? "eye-off" : "eye"} onPress={() => setPasswordVisible(!passwordVisible)} />}
      />

      {/* 4. ใช้ Button ของ Paper */}
      <Button
        mode="contained" // ทำให้ปุ่มมีสีพื้นหลัง
        onPress={handleLogin}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Login
      </Button>

      <Button
        mode="text" // ปุ่มแบบข้อความ สำหรับลิงก์
        onPress={() => navigation.navigate('Register')}
        style={styles.registerButton}
      >
        Don't have an account? Register here.
      </Button>
    </View>
  );
};

// 5. สร้างสไตล์ทั้งหมดไว้ที่นี่
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5', // สีพื้นหลังเทาอ่อน
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 16,
  },
  registerButton: {
    marginTop: 16,
  },
});

export default LoginScreen;