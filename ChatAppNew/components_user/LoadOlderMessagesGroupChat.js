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

const LoadOlderMessagesGroupChat = ({
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
    marginHorizontal: SPACING.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(60, 255, 0, 1)',
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 1)'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  loadingText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  loadButton: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    backgroundColor: '#F0F8FF',
    borderWidth: 0,
    borderColor: '#ffffffff',
    borderRadius: 0,
    margin: 4
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollAnimation: {
    width: 30,
    height: 30,
    marginRight: 8,
    transform: [{ rotate: '180deg' }]
  },
  textContainer: {
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000ff',
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

export default LoadOlderMessagesGroupChat;