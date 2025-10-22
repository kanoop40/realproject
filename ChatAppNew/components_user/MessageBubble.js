import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { API_URL } from '../../service/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

// SPACING, RADIUS, SHADOWS are now imported from theme

const MessageBubble = ({ 
  item, 
  currentUser, 
  recipientName, 
  recipientAvatar,
  selectionMode,
  selectedMessages,
  showTimeForMessages,
  onMessagePress,
  onLongPress,
  formatDateTime
}) => {
  const isMyMessage = item.sender && item.sender === currentUser?._id;

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}
      onLongPress={isMyMessage ? onLongPress : null}
      onPress={() => onMessagePress(item)}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      {/* Checkbox สำหรับ Selection Mode */}
      {selectionMode && selectedMessages.includes(item._id) && (
        <View style={[
          styles.checkboxContainer,
          { 
            right: isMyMessage ? 10 : 'auto',
            left: isMyMessage ? 'auto' : 50,
          }
        ]}>
          <Text style={styles.checkboxText}>✓</Text>
        </View>
      )}

      {/* Avatar สำหรับข้อความของผู้อื่น */}
      {!isMyMessage && (
        <View style={styles.messageAvatarContainer}>
          {recipientAvatar ? (
            <Image
              source={{ 
                uri: recipientAvatar.startsWith('http') 
                  ? recipientAvatar 
                  : `${API_URL}/${recipientAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
              }}
              style={styles.messageAvatar}
              defaultSource={require('../../assets/default-avatar.jpg')}
            />
          ) : (
            <View style={[styles.messageAvatar, styles.defaultMessageAvatar]}>
              <Text style={styles.messageAvatarText}>
                {(typeof recipientName === 'string' && recipientName.charAt(0)) 
                  ? recipientName.charAt(0).toUpperCase() 
                  : '?'}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[
        styles.messageContentContainer,
        isMyMessage ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
      ]}>
        {/* แสดงรูปภาพ */}
        {(item.image || (item.file && item.file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name))) && (
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: item.image 
                  ? (item.image.startsWith('http') ? item.image : `${API_URL}${item.image}`)
                  : `${API_URL}${item.file?.url || item.file?.file_path}`
              }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* แสดงข้อความ */}
        {item.content && item.content !== 'รูปภาพ' && item.content !== 'ไฟล์แนบ' && (
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            item.isOptimistic && styles.optimisticMessage,
            selectedMessages.includes(item._id) && styles.selectedMessage
          ]}>
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
              item.isOptimistic && styles.optimisticMessageText
            ]}>
              {(item?.content && typeof item.content === 'string' && item.content.trim() !== '') 
                ? item.content 
                : 'ข้อความ'}
            </Text>
            
            {item.editedAt && (
              <Text style={[
                styles.editedText, 
                isMyMessage ? styles.myEditedText : styles.otherEditedText
              ]}>
                แก้ไขแล้ว
              </Text>
            )}
          </View>
        )}

        {/* แสดงเวลา */}
        {(typeof showTimeForMessages === 'function' ? showTimeForMessages(item._id) : showTimeForMessages?.has?.(item._id)) && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
            </Text>
            {isMyMessage && (
              <Text style={styles.readStatus}>
                {item.isRead ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 10,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  checkboxText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageAvatarContainer: {
    marginRight: 12,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  defaultMessageAvatar: {
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  messageContentContainer: {
    flex: 1,
    maxWidth: '80%',
  },
  imageContainer: {
    marginBottom: 8,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: RADIUS.md,
  },
  messageBubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    maxWidth: '100%',
    ...SHADOWS.sm,
  },
  myMessageBubble: {
    backgroundColor: '#000000ff',
    alignSelf: 'flex-end',
  },
  otherMessageBubble: {
    backgroundColor: COLORS.backgroundSecondary,
    alignSelf: 'flex-start',
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  selectedMessage: {
    backgroundColor: COLORS.accentLight,
  },
  messageText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  myMessageText: {
    color: COLORS.textInverse,
  },
  otherMessageText: {
    color: COLORS.textPrimary,
  },
  optimisticMessageText: {
    fontStyle: 'italic',
  },
  editedText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 4,
    fontStyle: 'italic',
  },
  myEditedText: {
    color: COLORS.textInverse,
    opacity: 0.8,
  },
  otherEditedText: {
    color: COLORS.textSecondary,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#000000',
    marginRight: 4,
  },
  readStatus: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success,
    fontWeight: 'bold',
  },
});

export default MessageBubble;