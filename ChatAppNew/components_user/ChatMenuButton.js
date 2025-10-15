import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Animated,
  Dimensions,
  StyleSheet 
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

// SPACING, RADIUS, SHADOWS are now imported from theme

const ChatOptionsMenu = ({ 
  visible,
  onClose,
  onManageChat,
  onClearChat,
  onBlockUser,
  recipientName 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const menuItems = [
    {
      id: 'manage',
      title: 'จัดการแชท',
      subtitle: 'เลือกและลบข้อความ',
      icon: '✂️',
      color: COLORS.accent,
      onPress: onManageChat,
    },
   
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>ตัวเลือกแชท</Text>
            <View style={styles.menuDivider} />
          </View>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.lastMenuItem
              ]}
              onPress={() => {
                onClose();
                setTimeout(() => item.onPress(), 150);
              }}
            >
              <View style={styles.menuItemIcon}>
                <Text style={styles.menuItemIconText}>{item.icon}</Text>
              </View>
              
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: item.color }]}>
                  {item.title}
                </Text>
                <Text style={styles.menuItemSubtitle}>
                  {item.subtitle}
                </Text>
              </View>

              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const ChatMenuButton = ({ 
  onManageChat,
  onClearChat,
  onBlockUser,
  recipientName,
  disabled = false
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = () => {
    if (!disabled) {
      setMenuVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.menuButton,
          disabled && styles.menuButtonDisabled
        ]}
        onPress={handleMenuPress}
        disabled={disabled}
      >
        <View style={styles.dropdownIcon}>
          <View style={styles.dropdownDot} />
          <View style={styles.dropdownDot} />
          <View style={styles.dropdownDot} />
        </View>
      </TouchableOpacity>

      <ChatOptionsMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onManageChat={onManageChat}
        onClearChat={onClearChat}
        onBlockUser={onBlockUser}
        recipientName={recipientName}
      />
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  menuButtonDisabled: {
    opacity: 0.5,
  },
  dropdownIcon: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textPrimary,
    marginVertical: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: SPACING.md,
  },
  menuContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    minWidth: 250,
    maxWidth: 300,
    ...SHADOWS.lg,
    elevation: 8,
  },
  menuHeader: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  menuTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuItemIconText: {
    fontSize: 18,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  menuItemArrow: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
});

export default ChatMenuButton;