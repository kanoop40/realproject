import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios'; // ต้องติดตั้ง axios ก่อน: npm install axios

const API_URL = 'http://10.0.2.2:5000'; // สำหรับ Android Emulator
// const API_URL = 'http://localhost:5000'; // สำหรับ iOS Simulator

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

const handleLogin = async () => {
  try {
    setIsLoading(true);
    const response = await axios.post(`${API_URL}/api/users/login`, {
      username: username, // ส่ง username
      password
    });

    const { token, ...user } = response.data;
    
    if (user.role === 'admin') {
      navigation.replace('Admin');
    } else {
      Alert.alert('Error', 'Access denied. Admin only.');
    }
  } catch (error) {
    console.error('Login error:', error.response?.data || error);
    const message = error.response?.data?.message || 'Login failed';
    Alert.alert('Error', message);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>
          LOGIN
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Username</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Password</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Loading...' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFB800',
    textAlign: 'center',
    marginBottom: 40
  },
  form: {
    width: '100%',
    gap: 16
  },
  inputWrapper: {
    marginBottom: 16
  },
  labelContainer: {
    backgroundColor: '#FFB800',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4
  },
  label: {
    color: 'white',
    fontSize: 14
  },
  input: {
    backgroundColor: '#FFEDCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 4
  },
  loginButton: {
    backgroundColor: '#FFB800',
    borderRadius: 8,
    padding: 14,
    marginTop: 16
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500'
  }
});


export default LoginScreen;
