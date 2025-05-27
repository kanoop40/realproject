import React, { useState } from 'react';
import { View, TextInput, Button, Text, KeyboardAvoidingView, Platform, Image, TouchableOpacity, StyleSheet } from 'react-native';

import api from '../api/api';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async () => {
    try {
      const res = await api.post('/auth/login', { username, password });
      navigation.replace('Chat');
    } catch (err) {
      setError('เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Image
          source={require('../assets/login-image.png')} // ใส่ไฟล์รูปภาพไว้ที่ assets/login-image.png
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.label}>รหัสนักศึกษา/พนักงาน</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          placeholder="Username"
        />
        <Text style={styles.label}>รหัสผ่าน</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={onLogin}
          >
            <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.regisButton]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.buttonText}>สมัครสมาชิก</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f6f8fa',
  },
  innerContainer: {
    marginHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  label: {
    alignSelf: 'flex-start',
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 2,
    fontSize: 16,
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f3f3f3',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#1976d2',
  },
  regisButton: {
    backgroundColor: '#43a047',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LoginScreen;