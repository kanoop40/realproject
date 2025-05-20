import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import api from '../api/api';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
    try {
      const res = await api.post('/auth/login', { username, password });
      // save token, navigate
    } catch (err) {
      alert('Login failed');
    }
  }

  return (
    <View>
      <TextInput value={username} onChangeText={setUsername} placeholder="รหัส" />
      <TextInput value={password} onChangeText={setPassword} placeholder="รหัสผ่าน" secureTextEntry />
      <Button title="เข้าสู่ระบบ" onPress={onLogin} />
    </View>
  );
};

export default LoginScreen;