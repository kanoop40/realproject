import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { API_URL } from '../service/api';

const UserProfile = ({ user, onDelete }) => {
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const translateRole = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'อาจารย์';
      case 'student': return 'นักศึกษา';
      default: return role;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        console.log('🖱️ Pan gesture detected:', gestureState.dx, gestureState.dy);
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        console.log('👆 Pan responder granted');
        translateX.setOffset(translateX._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        console.log('🏃 Pan move:', gestureState.dx);
        // Only allow left swipe (negative dx)
        if (gestureState.dx <= 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.log('🔥 Pan release:', gestureState.dx);
        translateX.flattenOffset();
        
        if (gestureState.dx < -80) {
          console.log('📱 Opening swipe');
          // Open swipe
          Animated.spring(translateX, {
            toValue: -100,
            useNativeDriver: false,
          }).start();
          setIsSwipeOpen(true);
        } else {
          console.log('📱 Closing swipe');
          // Close swipe
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          setIsSwipeOpen(false);
        }
      },
    })
  ).current;

  const handleDeletePress = () => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบผู้ใช้ "${user.firstName} ${user.lastName}" หรือไม่?`,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            onDelete && onDelete(user);
            // Close swipe after delete
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
            setIsSwipeOpen(false);
          },
        },
      ]
    );
  };

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
    setIsSwipeOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* Delete Button (Hidden behind) */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeletePress}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
          <Text style={styles.deleteButtonLabel}>ลบ</Text>
        </TouchableOpacity>
      </View>

      {/* Main Profile Content */}
      <Animated.View 
        style={[
          styles.profileSection,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
          <TouchableOpacity 
            style={styles.profileContent}
            onPress={() => {
              console.log('📱 Profile touched, isSwipeOpen:', isSwipeOpen);
              if (isSwipeOpen) {
                closeSwipe();
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image
                  source={{ 
                    uri: user.avatar.startsWith('http') 
                      ? user.avatar 
                      : `${API_URL}/${user.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
                  }}
                  style={styles.avatar}
                  defaultSource={require('../assets/default-avatar.jpg')}
                  onError={(error) => {
                    console.log('❌ Avatar load error:', error.nativeEvent.error);
                    console.log('❌ Avatar path:', user.avatar);
                    console.log('❌ Full URL:', `${API_URL}/${user.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}`);
                  }}
                  onLoad={() => {
                    console.log('✅ Avatar loaded successfully:', user.avatar);
                  }}
                />
              ) : (
                <View style={[styles.avatar, styles.defaultAvatar]}>
                  <Text style={styles.avatarText}>
                    {user.firstName?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {/* Online Status Indicator */}
              <View style={[styles.statusIndicator, { backgroundColor: user.isOnline ? '#34C759' : '#8E8E93' }]} />
            </View>
            <Text style={styles.userName}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.userRole}>{translateRole(user.role)}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: user.isOnline ? '#34C759' : '#8E8E93' }]}>
              <Text style={styles.statusBadgeText}>
                {user.isOnline ? '🟢 กำลังใช้งาน' : '⚪ ออฟไลน์'}
              </Text>
            </View>


          </TouchableOpacity>
        </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 4,
  },
  deleteButtonLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  profileSection: {
    backgroundColor: '#fff',
    width: '100%',
  },
  profileContent: {
    alignItems: 'center',
    padding: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 15
  },
  avatar: {
    width: '100%',
    height: '100%'
  },
  defaultAvatar: {
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  userRole: {
    fontSize: 16,
    color: '#666'
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center'
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },

});

export default UserProfile;