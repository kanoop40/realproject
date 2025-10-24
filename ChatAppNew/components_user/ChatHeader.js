import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { API_URL } from '../service/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

// SPACING, RADIUS, SHADOWS are now imported from theme
import ChatMenuButton from './ChatMenuButton';

const ChatHeader = ({ 
  recipientName,
  recipientAvatar,
  roomName,
  selectionMode,
  selectedMessages,
  onBackPress,
  onCancelSelection,
  onDeleteSelected,
  onManageChat,
  navigation,
  chatroomId,
  returnChatId
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* ปุ่มกลับ */}
      <TouchableOpacity 
        onPress={onBackPress}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* ข้อมูลผู้ใช้ */}
      <View style={styles.userInfoContainer}>
        {recipientAvatar ? (
          <Image
            source={{ 
              uri: recipientAvatar.startsWith('http') 
                ? recipientAvatar 
                : `${API_URL}/${recipientAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
            }}
            style={styles.avatar}
            defaultSource={require('../assets/default-avatar.jpg')}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>
              {(typeof recipientName === 'string' && recipientName.charAt(0)) 
                ? recipientName.charAt(0).toUpperCase() 
                : '?'}
            </Text>
          </View>
        )}
        
        <View style={styles.nameContainer}>
          <Text style={styles.nameText}>
            {(typeof recipientName === 'string' && recipientName.trim()) ? recipientName : 'แชทส่วนตัว'}
          </Text>
          <Text style={styles.statusText}>ออนไลน์</Text>
        </View>
      </View>
      
      {/* ปุ่มด้านขวา */}
      <View style={styles.rightButtonsContainer}>
        {selectionMode ? (
          <>
            {/* ปุ่มยกเลิก */}
            <TouchableOpacity
              onPress={onCancelSelection}
              style={[styles.actionButton, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
            
            {/* ปุ่มลบ */}
            <TouchableOpacity
              onPress={onDeleteSelected}
              disabled={selectedMessages.length === 0}
              style={[
                styles.actionButton, 
                styles.deleteButton,
                selectedMessages.length === 0 && styles.disabledButton
              ]}
            >
              <Text style={[
                styles.deleteButtonText,
                selectedMessages.length === 0 && styles.disabledButtonText
              ]}>
                ลบ ({selectedMessages.length})
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <ChatMenuButton
            onManageChat={onManageChat}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 48,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  backButtonText: {
    fontSize: 18,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm + 4,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm + 4,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  nameContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
  },
  rightButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    minWidth: 60,
    minHeight: 32,
    marginLeft: SPACING.sm,
  },
  cancelButton: {
    backgroundColor: COLORS.textSecondary,
  },
  cancelButtonText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
  },
});

export default ChatHeader;