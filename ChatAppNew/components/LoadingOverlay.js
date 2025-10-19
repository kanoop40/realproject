import React from 'react';
import { View, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const LoadingOverlay = ({ 
  visible = false, 
  message = 'กำลังโหลด...', 
  animationSize = 100,
  backgroundColor = 'rgba(255, 255, 255, 1)'
}) => {
  if (!visible) return null;

  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: backgroundColor, 
      justifyContent: 'center', 
      alignItems: 'center',
      zIndex: 1000
    }}>
      <View style={{ 
        backgroundColor: 'transparent', 
        borderRadius: 12, 
        padding: 24, 
        alignItems: 'center',
        minWidth: 150
      }}>
        <LottieView
          source={require('../assets/Loading.json')}
          autoPlay
          loop
          style={{ width: animationSize, height: animationSize }}
        />
        <Text style={{ 
          color: '#000000', 
          fontSize: 16, 
          marginTop: 12, 
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {message}
        </Text>
      </View>
    </View>
  );
};

export default LoadingOverlay;