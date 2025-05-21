import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import api from '../api/api';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async () => {
    try {
      const res = await api.post('/auth/login', { username, password });
      // บันทึก token ใน storage และ navigate ไปหน้าหลัก
      // AsyncStorage.setItem('token', res.data.token);
      navigation.replace('Chat');
    } catch (err) {
      setError('เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>รหัสนักศึกษา/พนักงาน</Text>
      <TextInput value={username} onChangeText={setUsername} />
      <Text>รหัสผ่าน</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="เข้าสู่ระบบ" onPress={onLogin} />
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
    </View>
  );
};

export default LoginScreen;