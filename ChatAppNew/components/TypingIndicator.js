import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const TypingIndicator = ({ isVisible, userName = 'Someone' }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.typingContent}>
          <Text style={styles.typingText}>{userName} กำลังพิม</Text>
          <LottieView
            source={require('../assets/Texting.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxWidth: '80%',
    borderBottomLeftRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  animation: {
    width: 30,
    height: 20,
  },
});

export default TypingIndicator;