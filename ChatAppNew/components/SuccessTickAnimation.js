import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const SuccessTickAnimation = ({ visible, onComplete }) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (visible && animationRef.current) {
      console.log('✅ Playing success tick animation');
      
      // เล่น animation
      animationRef.current.play();
      
      // ซ่อนหลังจาก 2 วินาที
      const timer = setTimeout(() => {
        console.log('✅ Success animation completed');
        if (onComplete) {
          onComplete();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (onComplete) onComplete();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.animationContainer}>
          <LottieView
            ref={animationRef}
            source={require('../assets/Tick Animation.json')}
            autoPlay={true}
            loop={false}
            style={styles.animation}
            resizeMode="contain"
            speed={1.0}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.0)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  animation: {
    width: 80,
    height: 80,
  },
});

export default SuccessTickAnimation;