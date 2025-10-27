import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const TypingIndicator = ({ isVisible, userName = 'Someone' }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <LottieView
          source={require('../assets/Typing.json')}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  bubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxWidth: '80%',
    borderBottomLeftRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  animation: {
    width: 45,
    height: 30,
  },
});

export default TypingIndicator;