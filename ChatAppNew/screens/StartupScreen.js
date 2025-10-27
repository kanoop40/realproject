import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const StartupScreen = ({ onAnimationFinish }) => {
  const frame1AnimationRef = useRef(null);
  const chatAnimationRef = useRef(null);
  const [showChatAnimation, setShowChatAnimation] = useState(false);
  const [frame1Finished, setFrame1Finished] = useState(false);
  const [chatAnimationFinished, setChatAnimationFinished] = useState(false);
  const [canSkip, setCanSkip] = useState(true); // เปลี่ยนเป็น true เพื่อให้กดข้ามได้ตลอด

  useEffect(() => {
    // เริ่มเล่น Frame 1 animation ทันทีเมื่อ component โหลด
    if (frame1AnimationRef.current) {
      frame1AnimationRef.current.play();
    }
  }, []);

  const handleFrame1AnimationFinish = () => {
    console.log('🎬 Frame 1 animation finished, keeping it displayed');
    setFrame1Finished(true);
    
    // รอ 0.5 วินาที แล้วเริ่ม Chat animation
    setTimeout(() => {
      console.log('🎬 Starting Chat animation');
      setShowChatAnimation(true);
    }, 500);
  };

  const handleChatAnimationFinish = () => {
    console.log('🎬 Chat animation finished - keeping it displayed');
    setChatAnimationFinished(true);
    // ลบ setCanSkip(true) ออก เพราะตั้งค่าเป็น true ไว้แล้วตั้งแต่เริ่มต้น
    
    // Auto-skip หลังจาก 3 วินาที (หรือกดข้ามได้ตลอด)
    setTimeout(() => {
      if (onAnimationFinish) {
        console.log('🎬 Auto-skip to Welcome screen');
        onAnimationFinish();
      }
    }, 3000);
  };

  const handleScreenPress = () => {
    // ลบเงื่อนไข canSkip ออก เพื่อให้กดข้ามได้ตลอด
    console.log('🎬 Manual skip to Welcome screen');
    if (onAnimationFinish) {
      onAnimationFinish();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
      <View style={styles.container}>
        {/* Chat Animation - Layer 3 (ด้านบน) */}
        {showChatAnimation && (
          <View style={styles.chatAnimationContainer}>
            <LottieView
              ref={chatAnimationRef}
              source={require('../assets/Chat animation.json')}
              autoPlay={true}
              loop={false}
              speed={1.0}
              style={styles.chatAnimation}
              onAnimationFinish={handleChatAnimationFinish}
              resizeMode="contain"
            />
          </View>
        )}
        
        {/* Frame 1 Animation - Layer 2 (ด้านหน้า) */}
        <View style={styles.frame1AnimationContainer}>
          <LottieView
            ref={frame1AnimationRef}
            source={require('../assets/Frame 1.json')}
            autoPlay={true}
            loop={false}
            speed={2.5}
            style={styles.frame1Animation}
            onAnimationFinish={handleFrame1AnimationFinish}
            resizeMode="contain"
          />
        </View>

        {/* Skip indicator - แสดงตลอด เพื่อให้รู้ว่ากดข้ามได้ */}
        <View style={styles.skipIndicator}>
          <Text style={styles.skipText}>แตะที่หน้าจอเพื่อข้าม</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatAnimationContainer: {
    position: 'absolute',
    right: 50, // ขยับเข้ามาใกล้ Frame 1 มากขึ้น
    top: '50%',
    zIndex: 3, // Layer 3 (ด้านบนสุด - อยู่เหนือ Frame 1)
    transform: [{ translateY: -60 }], // ปรับตำแหน่งให้อยู่ใกล้ Frame 1 มากขึ้น
  },
  frame1AnimationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2, // Layer 2 (ด้านล่าง Chat Animation)
  },
  frame1Animation: {
    width: 280,
    height: 280,
  },
  chatAnimation: {
    width: 100,
    height: 100,
    // ลบ opacity เพื่อให้ Chat Animation เด่นชัดเมื่ออยู่ด้านบน
  },
  skipIndicator: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
});

export default StartupScreen;