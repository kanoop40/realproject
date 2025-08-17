import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

const InlineLoadingScreen = ({ 
  isVisible = true, 
  progress = 0, 
  title = "LOADING", 
  subtitle = "กรุณารอสักครู่",
  color = "#FFFFFF",
  backgroundColor = "#F5C842"
}) => {
  const progressAnimation = useRef(new Animated.Value(progress / 100)).current;
  
  // Animation values สำหรับแต่ละตัวอักษร
  const letterAnimations = useRef(
    title.split('').map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnimation, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimation]);

  useEffect(() => {
    if (isVisible) {
      // Reset animations
      letterAnimations.forEach(anim => anim.setValue(0));
      
      // Animate letters one by one from left to right
      const animations = letterAnimations.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 150,
          delay: index * 100, // 100ms delay between each letter
          useNativeDriver: true,
        })
      );

      // Start all animations
      Animated.stagger(0, animations).start();
    }
  }, [isVisible, letterAnimations]);

  if (!isVisible) return null;

  const letters = title.split('');

  return (
    <View 
      style={[styles.loadingContainer, { backgroundColor }]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {/* Animated Letters */}
      <View style={styles.letterContainer}>
        {letters.map((letter, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.letterText,
              {
                opacity: letterAnimations[index],
                transform: [
                  {
                    translateY: letterAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0], // Smaller slide up effect
                    }),
                  },
                  {
                    scale: letterAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1], // Smaller scale effect
                    }),
                  },
                ],
              },
            ]}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </Animated.Text>
        ))}
        
        {/* Animated dots */}
        <Animated.Text
          style={[
            styles.letterText,
            {
              opacity: letterAnimations[letterAnimations.length - 1],
              transform: [
                {
                  translateY: letterAnimations[letterAnimations.length - 1]?.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }) || 0,
                },
              ],
            },
          ]}
        >
          ..
        </Animated.Text>
      </View>
      
      {/* Progress Bar Container */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress)}%
        </Text>
      </View>
      
      {subtitle && (
        <Text style={styles.subtitleText}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = {
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 1000,
  },
  letterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  letterText: {
    fontSize: 32, // ขยายให้ใหญ่ขึ้นเหมือนในรูป
    fontWeight: 'bold',
    color: '#333333',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8, // ขยายความหนาของ progress bar
    backgroundColor: '#E6B800',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#333333',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 18, // ขยายขนาดเปอร์เซ็นต์
    fontWeight: 'bold',
    color: '#333333',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16, // ขยายขนาด subtitle
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
};

export default InlineLoadingScreen;
