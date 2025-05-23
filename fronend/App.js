import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { login } from './api';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const doLogin = async () => {
    try {
      const res = await login({ username, password });
      setResult('Login Success: ' + JSON.stringify(res.data));
    } catch (e) {
      setResult('Login Fail: ' + (e.response?.data?.message || e.message));
    }
  };

  return (
    <View>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={doLogin} />
      <Text>{result}</Text>
    </View>
  );
}