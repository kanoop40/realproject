import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username === 'admin' && password === 'admin') {
      navigation.navigate('Admin');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          LOGIN
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotContainer}>
            <Text style={styles.forgotText}>
              Forgot Password?
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
    padding: 24
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24
  },
  backText: {
    color: '#666666'
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40
  },
  logo: {
    width: 96,
    height: 96
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32
  },
  form: {
    gap: 16
  },
  inputContainer: {
    marginBottom: 16
  },
  label: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 8
  },
  input: {
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  loginButton: {
    backgroundColor: '#FFB800',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600'
  },
  forgotContainer: {
    marginTop: 16
  },
  forgotText: {
    color: '#FFB800',
    textAlign: 'center'
  }
});

export default LoginScreen;