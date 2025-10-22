import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { API_URL } from '../service/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

const GroupMessageBubble = ({ 
  item, 
  currentUser, 
  selectionMode,
  selectedMessages,
  showTimeForMessages,
  onMessagePress,
  onLongPress,
  onImagePress,
  onFilePress,
  formatDateTime,
  getFileIcon,
  decodeFileName,
  formatFileSize,
  toggleShowTime,
  shouldShowTime,
  index,
  getGroupReadStatus
}) => {
  // Handle both object and string sender formats with null safety
  const isMyMessage = (
    (item.sender && typeof item.sender === 'object' && item.sender?._id === currentUser._id) ||
    (item.sender && typeof item.sender === 'string' && currentUser?.firstName && (
      item.sender === currentUser.firstName ||
      item.sender === currentUser.firstName.split(' ')[0] ||
      currentUser.firstName.startsWith(item.sender) ||
      (item.sender && item.sender.includes && item.sender.includes(currentUser.firstName.split(' ')[0] || ''))
    ))
  );

  const showTime = shouldShowTime(item, index);
  const senderName = (item.sender && typeof item.sender === 'object') 
    ? (item.sender?.firstName || item.sender?.name || 'Unknown')
    : (item.sender || 'Unknown');

  const senderAvatar = (item.sender && typeof item.sender === 'object') 
    ? item.sender?.avatar 
    : null;

  const handleMessagePress = () => {
    if (selectionMode) {
      onMessagePress();
    } else {
      toggleShowTime(item._id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}
      onLongPress={onLongPress}
      onPress={handleMessagePress}
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
          {senderAvatar ? (
            <Image
              source={{ 
                uri: (senderAvatar && senderAvatar.startsWith && senderAvatar.startsWith('http'))
                  ? senderAvatar 
                  : `${API_URL}/${(senderAvatar || '').replace(/\\/g, '/').replace(/^\/+/, '')}`
              }}
              style={styles.messageAvatar}
            />
          ) : (
            <View style={[styles.messageAvatar, styles.defaultMessageAvatar]}>
              <Text style={styles.messageAvatarText}>
                {(senderName && senderName.charAt(0)) 
                  ? senderName.charAt(0).toUpperCase() 
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
        {/* แสดงชื่อผู้ส่งสำหรับข้อความของผู้อื่นในกลุ่ม */}
        {!isMyMessage && (
          <Text style={styles.senderName}>
            {senderName}
          </Text>
        )}

        {/* แสดงรูปภาพ */}
        {(item.messageType === 'image' || 
          item.image || 
          (item.fileName && typeof item.fileName === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName)) || 
          (item.content === 'รูปภาพ' && item.messageType === 'text')
        ) && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => {
              if (selectionMode) {
                onMessagePress();
              } else if (onImagePress) {
                onImagePress(
                  item.fileUrl || 
                  item.image || 
                  `${API_URL}${item.file?.url || item.file?.file_path}`
                );
              }
            }}
            disabled={false}
          >
            <Image
              source={{
                uri: item.fileUrl ||
                     (item.image && item.image.startsWith && item.image.startsWith('http') 
                       ? item.image 
                       : `${API_URL}${item.image || item.file?.url || item.file?.file_path || ''}`)
              }}
              style={styles.messageImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('GroupMessageBubble Image load error:', error.nativeEvent?.error || error);
                console.log('Failed URI:', item.fileUrl ||
                     (item.image && item.image.startsWith && item.image.startsWith('http') 
                       ? item.image 
                       : `${API_URL}${item.image || item.file?.url || item.file?.file_path || ''}`));
              }}
              onLoad={() => {
                console.log('GroupMessageBubble Image loaded successfully');
              }}
            />
          </TouchableOpacity>
        )}

        {/* แสดงไฟล์แนบ */}
        {(item.messageType === 'file' && item.fileName && 
          typeof item.fileName === 'string' &&
          !/\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName)) && (
          <TouchableOpacity 
            style={[
              styles.fileMessageBubble,
              isMyMessage ? styles.myFileBubble : styles.otherFileBubble
            ]}
            onPress={() => {
              if (selectionMode) {
                onMessagePress && onMessagePress();
              } else {
                onFilePress && onFilePress(item.fileUrl, item.fileName);
              }
            }}
          >
            <View style={styles.fileAttachment}>
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>
                  {getFileIcon(item.fileName)}
                </Text>
              </View>
              <View style={styles.fileInfo}>
                <Text style={[
                  styles.fileName, 
                  isMyMessage ? styles.myFileName : styles.otherFileName
                ]} numberOfLines={1}>
                  {decodeFileName(item.fileName)}
                </Text>
                {item.fileSize && (
                  <Text style={[
                    styles.fileSize, 
                    isMyMessage ? styles.myFileSize : styles.otherFileSize
                  ]}>
                    {formatFileSize(item.fileSize)}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* แสดงข้อความ */}
        {item.content && item.content !== 'รูปภาพ' && item.content !== 'ไฟล์แนบ' && item.content !== '📷 รูปภาพ' && item.content !== '📎 ไฟล์แนบ' && (
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            item.isTemporary && styles.optimisticMessage,
            selectedMessages.includes(item._id) && styles.selectedMessage
          ]}>
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
              item.isTemporary && styles.optimisticMessageText
            ]}>
              {(item?.content && typeof item.content === 'string' && item.content.trim() !== '') 
                ? item.content 
                : 'TEST MESSAGE'}
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

        {/* แสดงเวลาและสถานะการอ่าน */}
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {item.isTemporary ? 'กำลังส่ง...' : 
               item.sent ? 'ส่งแล้ว' :
               formatDateTime(item.timestamp) === 'N/A' || formatDateTime(item.timestamp) === 'Invalid DateTime' 
                 ? new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                 : formatDateTime(item.timestamp)}
            </Text>
            {isMyMessage && getGroupReadStatus && (() => {
              const readStatus = getGroupReadStatus(item);
              return readStatus && (
                <Text style={styles.readStatus}>
                  {readStatus.isRead ? '✓✓' : '✓'} {readStatus.text}
                </Text>
              );
            })()}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
    minHeight: 50,
    alignItems: 'flex-end',
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
    borderColor: '#ffffffff',
    backgroundColor: '#777777ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  checkboxText: {
    color: '#ffffffff',
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
    minWidth: 60,
  },
  senderName: {
    fontSize: 12,
    color: '#000000ff',
    fontWeight: '500',
    marginBottom: 2,
    marginLeft: 4,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '80%',
    
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: '#000000ff',
    alignSelf: 'flex-end',
  },
  otherMessageBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ffffffff',
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  selectedMessage: {
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    flexWrap: 'wrap',
    textAlign: 'left',
    fontFamily: 'System',
  },
  myMessageText: {
    color: '#ffffffff',
    fontWeight: '500',
  },
  otherMessageText: {
    color: '#000000ff',
    fontWeight: '500',
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
  // ไฟล์แนบ styles
  fileMessageBubble: {
    padding: 8,
    borderRadius: RADIUS.lg,
    marginBottom: 4,
    maxWidth: 250,
    ...SHADOWS.sm,
  },
  myFileBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
  },
  otherFileBubble: {
    backgroundColor: COLORS.backgroundSecondary,
    alignSelf: 'flex-start',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fileIconText: {
    fontSize: 16,
    color: COLORS.textInverse,
    fontWeight: 'bold',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  myFileName: {
    color: COLORS.textInverse,
  },
  otherFileName: {
    color: COLORS.textPrimary,
  },
  fileSize: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  myFileSize: {
    color: COLORS.textInverse,
    opacity: 0.8,
  },
  otherFileSize: {
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

export default GroupMessageBubble;