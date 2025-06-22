import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Dimensions,
} from 'react-native';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ดึงขนาดจอ
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async () => {
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, role } = res.data; // Assume the response includes the user's role

      if (token) {
        await AsyncStorage.setItem('token', token);

        // Navigate based on role
        if (role === 'admin') {
          navigation.replace('Dashboard');
        } else if (role === 'student' || role === 'teacher') {
          navigation.replace('Chat');
        } else {
          setError('Role ไม่ถูกต้อง');
        }
      } else {
        setError('เข้าสู่ระบบไม่สำเร็จ (ไม่พบ token)');
      }
    } catch (err) {
      setError('เข้าสู่ระบบไม่สำเร็จ');
      Alert.alert(
        'เข้าสู่ระบบไม่สำเร็จ',
        err?.response?.data?.message || 'กรุณาตรวจสอบรหัสผ่านและชื่อผู้ใช้'
      );
    }
  };

  return (
    <ImageBackground
      source={require('../assets/logo.png')}
      style={styles.bg}
      imageStyle={styles.bgImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.title}>LOGIN</Text>
          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <View style={styles.inputLabelBox}>
                <Text style={styles.inputLabel}>Username</Text>
              </View>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#ad8b34"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputLabelBox}>
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#ad8b34"
              />
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  bgImage: {
    width: screenWidth,
    height: screenHeight,
    opacity: 0.22,
    position: 'absolute',
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffb700',
    marginBottom: 32,
    letterSpacing: 1,
    textAlign: 'center',
  },
  inputSection: {
    width: '100%',
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    width: '100%',
  },
  inputLabelBox: {
    backgroundColor: '#ffb700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 88,
  },
  inputLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff7df',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#ad8b34',
    fontWeight: '500',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    marginTop: -6,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#ffb700',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    width: '100%',
    elevation: 2,
    shadowColor: '#ddd',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
});

export default LoginScreen;