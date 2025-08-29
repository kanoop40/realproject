import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';

const InlineLoadingScreen = ({ 
  isVisible = true, 
  progress = 0, 
  title = "LOADING", 
  subtitle = "กรุณารอสักครู่",
  color = COLORS.textPrimary,
  backgroundColor = COLORS.background
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    zIndex: 1000,
  },
  letterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  letterText: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    fontFamily: 'System',
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm + 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  subtitleText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
};

export default InlineLoadingScreen;
