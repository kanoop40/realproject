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
  onFilePress,
  formatDateTime,
  shouldShowTime,
  getFileIcon,
  decodeFileName,
  formatFileSize
}) => {
  // File fallback system working
  
  // Handle both object and string sender formats
  const isMyMessage = (
    (typeof item.sender === 'object' && item.sender?._id === currentUser._id) ||
    (typeof item.sender === 'string' && (
      item.sender === currentUser?.firstName ||
      item.sender === currentUser?.firstName?.split(' ')[0] ||
      currentUser?.firstName?.startsWith(item.sender) ||
      item.sender.includes(currentUser?.firstName?.split(' ')[0] || '')
    ))
  );
  const showTime = shouldShowTime(item, index);

  return (
    <View>
      <View style={[
        styles.fileMessageBubble,
        isMyMessage ? styles.myFileBubble : styles.otherFileBubble,
        item.isOptimistic && styles.optimisticMessage,
        selectedMessages.includes(item._id) && styles.selectedMessage
      ]}>
        <View style={styles.fileAttachmentContainer}>
          <TouchableOpacity 
            style={[
              styles.fileAttachment,
              isMyMessage ? styles.myFileAttachment : styles.otherFileAttachment
            ]}
            onPress={() => onFilePress(item)}
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
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Time and status for files */}
      {(showTime || showTimeForMessages.has(item._id)) && (
        <Animated.View 
          style={[
            styles.messageTimeBottomContainer,
            isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom,
            {
              opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
              maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                (timeAnimations[item._id]).interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 30]
                }) : 0)
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
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
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