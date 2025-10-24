import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

const FileMessage = ({ 
  item, 
  index, 
  currentUser, 
  showTimeForMessages,
  timeAnimations,
  selectedMessages,
  selectionMode,
  onFilePress,
  onMessagePress,
  onLongPress,
  formatDateTime,
  shouldShowTime,
  getFileIcon,
  decodeFileName,
  formatFileSize
}) => {
  // File fallback system working
  
  // Handle both object and string sender formats with null safety
  const isMyMessage = (
    (item.sender && typeof item.sender === 'object' && item.sender?._id === currentUser._id) ||
    (item.sender && typeof item.sender === 'string' && (
      item.sender === currentUser?.firstName ||
      item.sender === currentUser?.firstName?.split(' ')[0] ||
      currentUser?.firstName?.startsWith(item.sender) ||
      (item.sender && item.sender.includes && item.sender.includes(currentUser?.firstName?.split(' ')[0] || ''))
    ))
  );
  const showTime = shouldShowTime ? shouldShowTime(item._id) : false;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.fileMessageBubble,
          isMyMessage ? styles.myFileBubble : styles.otherFileBubble,
          item.isOptimistic && styles.optimisticMessage,
          selectedMessages.includes(item._id) && styles.selectedMessage
        ]}
        onPress={() => {
          if (selectionMode) {
            // ในโหมดจัดการแชท ให้เลือกข้อความ
            onMessagePress && onMessagePress(item._id);
          } else {
            // โหมดปกติ ให้แสดงเวลา และเปิดไฟล์
            onMessagePress && onMessagePress(item._id);
            setTimeout(() => {
              const fileData = {
                file_name: item.file?.file_name || item.fileName || item.file_name,
                fileName: item.file?.fileName || item.fileName || item.file_name,
                url: item.file?.url || item.fileUrl || item.url,
                file_path: item.file?.file_path || item.filePath || item.file_path,
                size: item.file?.size || item.fileSize || item.size,
                ...item.file,
                ...(item.fileName && { fileName: item.fileName }),
                ...(item.fileUrl && { url: item.fileUrl })
              };
              onFilePress && onFilePress(fileData);
            }, 200);
          }
        }}
        onLongPress={() => onLongPress && onLongPress(item._id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.fileAttachmentContainer}>
          <View 
            style={[
              styles.fileAttachment,
              isMyMessage ? styles.myFileAttachment : styles.otherFileAttachment
            ]}
          >
            <View style={styles.fileIcon}>
              {getFileIcon(decodeFileName(item.fileName || item.file?.file_name || 'unknown_file'))}
            </View>
            <View style={styles.fileDetails}>
              <Text style={[
                styles.fileName,
                { color: isMyMessage ? "#fff" : "#333" }
              ]} numberOfLines={2}>
                {item.fileName || item.file?.file_name || 'ไฟล์ที่ไม่สามารถแสดงได้'}
              </Text>
              <Text style={[
                styles.fileSize,
                { color: isMyMessage ? "rgba(255,255,255,0.8)" : "#666" }
              ]}>
                {(item.fileSize || item.file?.size) ? formatFileSize(item.fileSize || item.file.size) : 'ไม่มีข้อมูลไฟล์จาก server'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Time and status for files */}
      {showTime && (
        <Animated.View 
          style={[
            styles.messageTimeBottomContainer,
            isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom,
            {
              opacity: timeAnimations[item._id] || new Animated.Value(1),
              maxHeight: timeAnimations[item._id] ? 
                (timeAnimations[item._id]).interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 30]
                }) : 30
            }
          ]}
        >
          <View style={styles.timeAndStatusRow}>
            <Text style={[
              styles.messageTimeBottom,
              isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
            ]}>
              {item.isOptimistic ? 'กำลังส่ง...' : (formatDateTime && item.timestamp ? formatDateTime(item.timestamp) : 'N/A')}
            </Text>
            {isMyMessage && !item.isOptimistic && (
              <View style={styles.readStatusContainer}>
                <Text style={[
                  styles.readStatusIcon,
                  item.isRead ? styles.readStatusIconRead : styles.readStatusIconSent
                ]}>
                  {item.isRead ? '✓✓' : '✓'}
                </Text>
                <Text style={[
                  styles.readStatusBottom,
                  isMyMessage ? styles.myReadStatusBottom : styles.otherReadStatusBottom
                ]}>
                  {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fileMessageBubble: {
    padding: 4,
    borderRadius: 18,
    marginBottom: 4,
  },
  myFileBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-end',
  },
  otherFileBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  optimisticMessage: {
    opacity: 0.7
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
  fileAttachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 200,
  },
  myFileAttachment: {
    backgroundColor: '#000000',
  },
  otherFileAttachment: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileIcon: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
  },
  messageTimeBottomContainer: {
    alignItems: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 5,
  },
  timeAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  readStatusIcon: {
    fontSize: 12,
    marginRight: 4,
    fontWeight: 'bold',
  },
  readStatusIconSent: {
    color: '#999',
  },
  readStatusIconRead: {
    color: '#000000',
  },
  messageTimeBottom: {
    fontSize: 10,
    color: '#666',
    lineHeight: 12,
    textAlign: 'left',
    marginRight: 8,
  },
  myMessageTimeBottom: {
    color: '#666',
  },
  otherMessageTimeBottom: {
    color: '#666',
  },
  readStatusBottom: {
    fontSize: 9,
    lineHeight: 10,
    textAlign: 'left',
  },
  myReadStatusBottom: {
    color: '#666',
  },
  otherReadStatusBottom: {
    color: '#666',
  },
});

export default FileMessage;