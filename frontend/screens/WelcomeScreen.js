import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Login Button */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>
            Login
          </Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20
  },
  loginButton: {
    backgroundColor: '#FFB800',
    width: 150,
    paddingVertical: 12,
    borderRadius: 8
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18
  }
});

export default WelcomeScreen;