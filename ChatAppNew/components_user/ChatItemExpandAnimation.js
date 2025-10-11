import React, { useRef, useEffect } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ChatItemExpandAnimation = ({ 
  isVisible, 
  onAnimationComplete, 
  children,
  originalLayout 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible && originalLayout) {
      // Animation แบบเบา - แค่ลอยขึ้นนิดหน่อยแล้วไปหน้าแชท
      Animated.sequence([
        // Phase 1: ลอยขึ้นและขยายเล็กน้อย
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Phase 2: กลับสู่ปกติและ fade out
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // เรียก callback เมื่อ animation เสร็จ
        onAnimationComplete();
      });
    }
  }, [isVisible, originalLayout]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          left: originalLayout?.x || 0,
          top: originalLayout?.y || 0,
          width: originalLayout?.width || 0,
          height: originalLayout?.height || 0,
          transform: [
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
});

export default ChatItemExpandAnimation;