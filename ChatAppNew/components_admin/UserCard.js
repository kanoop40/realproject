import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { API_URL } from '../service/api';
import { AvatarImage } from '../service/avatarUtils';

const UserCard = ({ user, onPress, onDelete }) => {
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  // Reset swipe when component updates
  React.useEffect(() => {
    if (!isSwipeOpen) {
      translateX.setValue(0);
    }
  }, [user._id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        // Don't set offset here, handle it manually
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentValue = translateX._value;
        let newValue = gestureState.dx;
        
        // If already open, adjust the movement
        if (isSwipeOpen) {
          newValue = -100 + gestureState.dx;
        }
        
        // Limit the range: 0 to -100
        if (newValue > 0) {
          newValue = 0;
        } else if (newValue < -100) {
          newValue = -100;
        }
        
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const currentValue = translateX._value;
        const velocity = gestureState.vx;
        
        // If swiping fast to the left, open
        if (velocity < -0.5 && !isSwipeOpen) {
          Animated.spring(translateX, {
            toValue: -100,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }).start();
          setIsSwipeOpen(true);
        }
        // If swiping fast to the right, close
        else if (velocity > 0.5 && isSwipeOpen) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }).start();
          setIsSwipeOpen(false);
        }
        // Based on position
        else if (currentValue < -50) {
          // Open swipe
          Animated.spring(translateX, {
            toValue: -100,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }).start();
          setIsSwipeOpen(true);
        } else {
          // Close swipe
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
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
            onDelete && onDelete(user._id, user.username);
            // Close swipe after delete
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 100,
              friction: 8,
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
      tension: 100,
      friction: 8,
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
          <Text style={styles.deleteButtonText}></Text>
          <Text style={styles.deleteButtonLabel}>ลบ</Text>
          <Text style={styles.swipeHint}>← ปัด</Text>
        </TouchableOpacity>
      </View>

      {/* Main Card Content */}
      <Animated.View 
        style={[
          styles.userCard,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => {
            console.log('🎯 Card pressed, isSwipeOpen:', isSwipeOpen);
            if (isSwipeOpen) {
              closeSwipe();
            } else {
              onPress(user);
            }
          }}
        >
        <View style={styles.leftContent}>
          <View style={styles.avatarContainer}>
            <AvatarImage 
              avatarPath={user.avatar} 
              name={user.firstName} 
              size={50} 
              style={styles.avatar}
            />
          </View>
          <View style={styles.userTextContainer}>
            <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.usernameText}>@{user.username}</Text>
            <Text style={styles.roleText}>
              {user.role === 'student' ? 'นักศึกษา' : 
               user.role === 'admin' ? 'ผู้ดูแลระบบ' : 
               user.role === 'teacher' ? 'อาจารย์' : 
               user.role === 'staff' ? 'เจ้าหน้าที่' : user.role}
            </Text>
          </View>
        </View>
        <View style={styles.chevronContainer}>
          <Text style={styles.chevronIcon}>▶</Text>
        </View>
      </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 12,
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
    fontSize: 20,
    color: '#fff',
    marginBottom: 2,
  },
  deleteButtonLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  swipeHint: {
    fontSize: 8,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  userCard: {
    backgroundColor: '#dcdbdbff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  emptyAvatar: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  roleText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  chevronContainer: {
    padding: 8,
  },
  chevronIcon: {
    fontSize: 12,
    color: '#ccc',
  },
});

export default UserCard;