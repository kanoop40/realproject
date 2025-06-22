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
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { SharedElement } from 'react-navigation-shared-element';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    // Animate form fields entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const onLogin = () => {
    if (username && password) {
      if (username === 'admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('UserDashboard');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>LOGIN</Text>
          </View>

          {/* Background Logo with Shared Element */}
          <View style={styles.backgroundLogoContainer}>
            <SharedElement id="logo">
              <View style={styles.backgroundLogoWrapper}>
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.backgroundLogo}
                  resizeMode="contain"
                />
              </View>
            </SharedElement>
          </View>

          {/* Animated Input Section */}
          <Animated.View 
            style={[
              styles.inputSection,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.inputRow}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Username</Text>
              </View>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholder="กรอกชื่อผู้ใช้"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholder="กรอกรหัสผ่าน"
                placeholderTextColor="#999"
              />
            </View>
          </Animated.View>

          {/* Login Button with Shared Element */}
          <Animated.View 
            style={[
              styles.buttonContainer,
              { opacity: fadeAnim }
            ]}
          >
            <SharedElement id="loginButton">
              <TouchableOpacity
                style={styles.loginButton}
                onPress={onLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </SharedElement>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 3,
  },
  backgroundLogoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backgroundLogoWrapper: {
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
  },
  backgroundLogo: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.5,
  },
  inputSection: {
    marginTop: 80,
    zIndex: 5,
  },
  inputRow: {
    marginBottom: 20,
  },
  labelContainer: {
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginBottom: 2,
  },
  inputLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContainer: {
    marginTop: 40,
    alignItems: 'center',
    zIndex: 5,
  },
  loginButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 25,
    width: screenWidth * 0.7,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default LoginScreen;