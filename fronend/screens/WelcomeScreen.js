import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SharedElement } from 'react-navigation-shared-element';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Shared Element Logo */}
      <SharedElement id="sharedLogo">
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </SharedElement>

      {/* Welcome Text */}
      <Text style={styles.welcomeText}>WELCOME</Text>

      {/* Login Button */}
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: '#ffc107',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 2,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;