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
            <Text style={styles.icon}>📜</Text>
            <View style={styles.textContainer}>
              <Text style={styles.buttonText}>โหลดข้อความเก่า</Text>
              <Text style={styles.subText}>แตะเพื่อโหลดอีก 30 ข้อความ</Text>
            </View>
            <Text style={styles.arrow}>↑</Text>
          </View>
        </TouchableOpacity>
      )}
      
      {messagesCount > 0 && (
        <View style={styles.messageCounter}>
          <Text style={styles.counterText}>ข้อความทั้งหมด: {messagesCount}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(240, 248, 255, 0.9)',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 122, 255, 0.2)'
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
    borderWidth: 0.5,
    borderColor: '#007AFF',
    borderRadius: 8,
    margin: 4
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  icon: {
    fontSize: 14,
    marginRight: 6
  },
  textContainer: {
    flex: 1,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center'
  },
  subText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 0
  },
  arrow: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 6
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