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
  
  // Extract filename from content pattern [ไฟล์: filename.ext]
  const extractFileNameFromContent = (content) => {
    if (!content || typeof content !== 'string') return null;
    const match = content.match(/\[ไฟล์:\s*([^\]]+)\]/);
    return match ? match[1].trim() : null;
  };
  
  // Get display filename from various sources - improved priority order
  const getDisplayFileName = () => {
    // Priority 1: Direct fileName field
    if (item.fileName) {
      console.log('📁 Using fileName field:', item.fileName);
      return item.fileName;
    }
    
    // Priority 2: file.file_name (from File document)
    if (item.file?.file_name) {
      console.log('📁 Using file.file_name:', item.file.file_name);
      return item.file.file_name;
    }
    
    // Priority 3: Extract from content pattern
    const extractedName = extractFileNameFromContent(item.content);
    if (extractedName) {
      console.log('� Extracted filename from content:', extractedName);
      return extractedName;
    }
    
    // Priority 4: Try to get from temp file data (for optimistic messages)
    if (item.isTemporary && item.originalFileName) {
      console.log('📁 Using temporary originalFileName:', item.originalFileName);
      return item.originalFileName;
    }
    
    // Priority 5: Check if we have fileUrl and try to extract filename
    if (item.fileUrl) {
      try {
        const url = new URL(item.fileUrl);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop();
        if (filename && filename.includes('.')) {
          console.log('📁 Extracted filename from URL:', filename);
          return filename;
        }
      } catch (error) {
        console.log('❌ Error extracting filename from URL:', error);
      }
    }
    
    // Fallback: Default name
    console.log('📁 Using fallback: ไฟล์แนบ');
    return 'ไฟล์แนบ';
  };
  
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
          selectedMessages.includes(item._id) && styles.selectedMessage,
          // เพิ่ม style สำหรับไฟล์ที่ไม่พร้อมใช้
          !(item.fileUrl || item.file?.url || item.file?.file_path) && 
          (item.content && item.content.includes('[ไฟล์:')) && 
          { opacity: 0.7 }
        ]}
        onPress={() => {
          if (selectionMode) {
            // ใน selection mode ให้เรียก onMessagePress เพื่อเลือก/ยกเลิกการเลือก
            onMessagePress && onMessagePress(item._id);
          } else {
            // โหมดปกติ ให้แสดงเวลา และแสดงตัวเลือกไฟล์
            onMessagePress && onMessagePress(item._id);
            setTimeout(() => {
              const displayFileName = getDisplayFileName();
              const fileData = {
                file_name: item.file?.file_name || item.fileName || displayFileName,
                fileName: item.file?.fileName || item.fileName || displayFileName,
                url: item.file?.url || item.fileUrl || item.url,
                file_path: item.file?.file_path || item.filePath || item.file_path,
                size: item.file?.size || item.fileSize || item.size,
                ...item.file,
                ...(item.fileName && { fileName: item.fileName }),
                ...(item.fileUrl && { url: item.fileUrl }),
                ...(displayFileName && displayFileName !== 'ไฟล์แนบ' && { fileName: displayFileName })
              };
              onFilePress && onFilePress(fileData);
            }, 200);
          }
        }}
        onLongPress={() => onLongPress && onLongPress(item._id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.fileAttachment}>
          <View style={styles.fileIcon}>
            {(() => {
              const displayName = getDisplayFileName();
              const decodedName = decodeFileName(displayName);
              const icon = getFileIcon(decodedName);
              console.log('🔧 FileMessage icon debug:', {
                displayName,
                decodedName,
                icon,
                content: item.content
              });
              return icon;
            })()}
          </View>
          <View style={styles.fileInfo}>
            <Text style={[
              styles.fileName,
              isMyMessage ? styles.myFileName : styles.otherFileName
            ]} numberOfLines={2} ellipsizeMode="middle">
              {(() => {
                const fileName = getDisplayFileName();
                
                // If we have a proper filename, decode and display it
                if (fileName && fileName !== 'ไฟล์แนบ') {
                  try {
                    // Handle URL-encoded filenames
                    if (fileName.includes('%')) {
                      const decoded = decodeURIComponent(fileName);
                      console.log('🔧 Decoded filename:', fileName, '→', decoded);
                      return decoded;
                    }
                    // Handle regular filenames
                    return decodeFileName ? decodeFileName(fileName) : fileName;
                  } catch (error) {
                    console.log('❌ Error decoding filename:', error);
                    return fileName;
                  }
                }
                
                // Fallback to content-based display
                return fileName;
              })()}
            </Text>
            <Text style={[
              styles.fileSize,
              isMyMessage ? styles.myFileSize : styles.otherFileSize
            ]}>
              {(() => {
                // ตรวจสอบว่ามี fileUrl หรือไม่
                const hasFileUrl = item.fileUrl || item.file?.url || item.file?.file_path;
                
                if (item.fileSize || item.file?.size) {
                  return formatFileSize(item.fileSize || item.file.size);
                } else if (!hasFileUrl && (item.content && item.content.includes('[ไฟล์:'))) {
                  return 'ไฟล์ไม่พร้อมใช้';
                } else {
                  return 'ไฟล์';
                }
              })()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Time and status for files - ไม่แสดงในโหมดเลือก */}
      {showTime && !selectionMode && (
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
                  {item.isRead ? '' : ''}
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
    padding: 8,
    borderRadius: 18,
    marginBottom: 4,
    minWidth: 280, // เพิ่ม minimum width เหมือน GroupMessageBubble
    maxWidth: '85%', // เปลี่ยนเป็น percentage เพื่อให้ responsive
    ...SHADOWS.sm,
  },
  myFileBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end'
  },
  otherFileBubble: {
    backgroundColor: COLORS.backgroundSecondary,
    alignSelf: 'flex-start'
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
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor:'#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  fileInfo: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0, // ป้องกัน flex shrink ปัญหา
  },
  fileName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500',
    marginBottom: 2
  },
  myFileName: {
    color: COLORS.textInverse,
  },
  otherFileName: {
    color: COLORS.textPrimary,
  },
  fileSize: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2
  },
  myFileSize: {
    color: COLORS.textInverse,
    opacity: 0.8,
  },
  otherFileSize: {
    color: COLORS.textSecondary,
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

export default React.memo(FileMessage);