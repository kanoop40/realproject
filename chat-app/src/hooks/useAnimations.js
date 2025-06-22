import { useRef } from 'react';
import { Animated, Easing } from 'react-native';

export const useAnimations = () => {
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(50)).current;

  const messageAnimation = {
    scale: scale.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1]
    }),
    opacity: fade,
    transform: [{ translateY: slideY }]
  };

  const animateMessage = () => {
    scale.setValue(0);
    fade.setValue(0);
    slideY.setValue(50);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50
      })
    ]).start();
  };

  return {
    messageAnimation,
    animateMessage
  };
};