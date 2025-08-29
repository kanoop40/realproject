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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../service/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

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
    backgroundColor: COLORS.background
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center'
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.xl,
    color: COLORS.textPrimary
  },
  form: {
    width: '100%'
  },
  inputWrapper: {
    marginBottom: SPACING.lg
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginBottom: SPACING.xs,
    color: COLORS.textPrimary,
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm + 4,
    fontSize: TYPOGRAPHY.fontSize.md,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.md
  },
  loginButtonDisabled: {
    opacity: 0.6
  },
  loginButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: 'bold'
  },
  testButton: {
    backgroundColor: COLORS.success,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm
  },
  testButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: 'bold'
  },
  debugButton: {
    backgroundColor: COLORS.warning,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm + 2,
    fontSize: TYPOGRAPHY.fontSize.sm
  }
});

export default LoginScreen;