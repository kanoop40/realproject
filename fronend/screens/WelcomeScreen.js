import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { SharedElement } from 'react-navigation-shared-element';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section with Shared Element */}
        <View style={styles.logoSection}>
          <SharedElement id="logo">
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </SharedElement>
        </View>

        {/* Login Button with Shared Element */}
        <View style={styles.buttonSection}>
          <SharedElement id="loginButton">
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </SharedElement>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Light gray background like in image
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  logo: {
    width: 100,
    height: 100,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loginButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    paddingHorizontal: 80,
    borderRadius: 30,
    width: screenWidth * 0.8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: '#333',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default WelcomeScreen;