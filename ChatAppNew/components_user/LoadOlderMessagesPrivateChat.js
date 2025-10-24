import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import LottieView from 'lottie-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';

const LoadOlderMessagesPrivateChat = ({
  visible = false,
  isLoading = false,
  canLoadMore = true,
  onLoadMore,
  messagesCount = 0,
  style
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    if (visible && canLoadMore) {
      // แสดงปุ่มด้วยแอนิเมชัน
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // ซ่อนปุ่มด้วยแอนิเมชัน
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, canLoadMore]);

  if (!visible || !canLoadMore) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>กำลังโหลดข้อความเก่า...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.loadButton}
          onPress={onLoadMore}
          activeOpacity={0.7}
        >
          <View style={styles.buttonContent}>
            <LottieView
              source={require('../assets/Scroll Down Arrow.json')}
              autoPlay
              loop
              style={styles.scrollAnimation}
            />
            <View style={styles.textContainer}>
              <Text style={styles.buttonText}>โหลดข้อความเก่า</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // พื้นหลังโปร่งใส
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  loadButton: {
    // ลบ background, border, และ padding
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // พื้นหลังโปร่งใส
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs, // padding เล็กน้อยเพื่อให้กดง่าย
  },
  scrollAnimation: {
    width: 24, // ลดขนาดให้เล็กลง
    height: 24,
    marginRight: 6,
    transform: [{ rotate: '180deg' }]
  },
  textContainer: {
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary, // ใช้สีที่นุ่มกว่า
    textAlign: 'center'
  },
  subText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 0
  },
  messageCounter: {
    backgroundColor: '#E8F4FD',
    paddingVertical: 4,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center'
  },
  counterText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '400'
  }
});

export default LoadOlderMessagesPrivateChat;