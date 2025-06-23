import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Pressable } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styled } from 'nativewind';

// ทำให้ Component ของ React Native ใช้ className ได้
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledPressable = styled(Pressable);

const API_URL = 'http://10.0.2.2:5000/api/users';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

      // ดึง token จาก response
      const { token } = response.data;

      // เก็บ token ลงใน AsyncStorage
      await AsyncStorage.setItem('userToken', token);

      // แจ้งเตือนและนำทางไปหน้า Home
      Alert.alert('Success', `Welcome ${response.data.name}`);
      navigation.replace('Home'); // ใช้ replace เพื่อไม่ให้ย้อนกลับมาหน้า Login ได้

    } catch (error) {
      console.error(error);
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  return (
    <StyledView className="flex-1 justify-center p-5 bg-gray-100">
      <StyledText className="text-3xl font-bold mb-6 text-center text-gray-800">
        Login
      </StyledText>
      <StyledTextInput
        className="h-12 border border-gray-300 rounded-lg mb-3 px-4 bg-white"
        placeholder="Email (รหัสนักศึกษา/พนักงาน)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <StyledTextInput
        className="h-12 border border-gray-300 rounded-lg mb-4 px-4 bg-white"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />

      <StyledPressable onPress={() => navigation.navigate('Register')} className="mt-4">
        <StyledText className="text-center text-blue-500">
          Don't have an account? Register here.
        </StyledText>
      </StyledPressable>
    </StyledView>
  );
};

export default LoginScreen;