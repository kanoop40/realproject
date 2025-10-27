import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

const ChatMenuButton = ({
  onManageMessages,
  onManageChat // รองรับทั้งสองแบบ
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const openMenu = () => {
    setShowMenu(true);
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setShowMenu(false);
    });
  };

  const handleMenuOption = (action) => {
    closeMenu();
    setTimeout(() => {
      action();
    }, 200);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={openMenu}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.menuButtonText}>⋮</Text>
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View 
            style={[
              styles.dropdownMenu,
              {
                transform: [
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }
                ],
                opacity: animation
              }
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const action = onManageMessages || onManageChat;
                if (action) {
                  handleMenuOption(action);
                } else {
                  console.error('❌ No action provided to ChatMenuButton');
                }
              }}
            >
              <Text style={styles.menuItemIcon}>📝</Text>
              <Text style={styles.menuItemText}>จัดการข้อความ</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs
  },
  menuButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: 'bold',
    transform: [{ rotate: '90deg' }]
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: SPACING.md
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: SPACING.xs,
    minWidth: 180,
    ...SHADOWS.medium
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  menuItemIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
    width: 24,
    textAlign: 'center'
  },
  menuItemText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: '500'
  }
});

export default ChatMenuButton;
