import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated
} from 'react-native';
import { API_URL } from '../service/api';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

const ImageMessage = ({ 
  item, 
  index, 
  currentUser, 
  showTimeForMessages,
  timeAnimations,
  selectedMessages,
  selectionMode,
  onImagePress,
  onMessagePress,
  onLongPress,
  formatDateTime,
  shouldShowTime
}) => {
  // Image fallback system working - updated
  
  // ฟังก์ชันสำหรับสร้าง URI รูปภาพ
  const getImageUri = (item) => {
    console.log('🖼️ getImageUri called for:', {
      messageId: item._id,
      messageType: item.messageType,
      fileUrl: item.fileUrl,
      image: item.image,
      file: item.file,
      isTemporary: item.isTemporary,
      isOptimistic: item.isOptimistic
    });
    
    // ลำดับความสำคัญในการหา URI รูปภาพ
    
    // 0. Optimistic message - ใช้ local URI โดยตรง
    if (item.isOptimistic && item.image) {
      console.log('🖼️ Using optimistic image URI:', item.image);
      return item.image;
    }
    
    // 1. Cloudinary URL (เป็น full URL แล้ว)
    if (item.fileUrl && item.fileUrl.includes('cloudinary.com')) {
      return item.fileUrl;
    }
    
    // 2. File URL จาก API (full HTTP URL)
    if (item.fileUrl && item.fileUrl.startsWith('http')) {
      return item.fileUrl;
    }
    
    // 3. Direct image URL (full HTTP URL)
    if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
      return item.image;
    }
    
    // 4. File path จาก file object
    if (item.file?.url && item.file.url.startsWith('http')) {
      return item.file.url;
    }
    
    // 5. Local file URI (สำหรับไฟล์ที่เพิ่งเลือกจากเครื่อง)
    if (item.fileUrl && (item.fileUrl.startsWith('file://') || item.fileUrl.startsWith('content://'))) {
      return item.fileUrl;
    }
    
    if (item.image && (item.image.startsWith('file://') || item.image.startsWith('content://'))) {
      return item.image;
    }
    
    // 6. Relative path - ต่อกับ API_URL
    const relativePath = item.fileUrl || 
                         item.image || 
                         item.file?.url || 
                         item.file?.file_path;
    
    if (relativePath && typeof relativePath === 'string') {
      // ลบ slash ที่ซ้ำออก
      const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      return `${API_URL}/${cleanPath}`;
    }
    
    // 7. Fallback
    console.log('⚠️ No valid image URI found for:', item._id);
    return null;
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
          styles.imageMessageBubble,
          isMyMessage ? styles.myImageBubble : styles.otherImageBubble,
          item.isOptimistic && styles.optimisticMessage,
          selectedMessages.includes(item._id) && styles.selectedMessage
        ]}
        onPress={() => {
          if (selectionMode) {
            // ใน selection mode ให้เรียก onMessagePress เพื่อเลือก/ยกเลิกการเลือก
            onMessagePress && onMessagePress(item._id);
          } else {
            // โหมดปกติ แสดงเวลา และเปิดรูป
            onMessagePress && onMessagePress(item._id);
            const imageUri = getImageUri(item);
            setTimeout(() => onImagePress && onImagePress(imageUri), 200);
          }
        }}
        onLongPress={() => onLongPress && onLongPress(item._id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {/* Check if we have actual image data */}
          {(() => {
            const resolvedUri = getImageUri(item);
            const hasImageData = !!resolvedUri;
            
            // Only log if there are issues
            if (!hasImageData || !resolvedUri) {
              console.log('🖼️ Image display issue:', {
                messageId: item._id,
                hasImageData,
                resolvedUri,
                messageType: item.messageType,
                fileUrl: item.fileUrl,
                image: item.image,
                file: item.file
              });
            }
            
            return hasImageData;
          })() ? (
            <Image
              source={{ 
                uri: getImageUri(item)
              }}
              style={styles.messageImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('❌ Image load error:', error.nativeEvent?.error || error);
                console.log('❌ Failed URI:', getImageUri(item));
                console.log('🔍 Item data:', {
                  fileUrl: item.fileUrl,
                  image: item.image,
                  file: item.file,
                  messageType: item.messageType
                });
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully');
                console.log('✅ Loaded URI:', getImageUri(item));
              }}
            />
          ) : (
            <View style={[styles.messageImage, styles.brokenImageContainer]}>
              <Text style={styles.brokenImageText}>📷</Text>
              <Text style={styles.brokenImageSubText}>รูปภาพไม่พร้อมใช้งาน</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Time and status for images - ไม่แสดงในโหมดเลือก */}
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
  imageMessageBubble: {
    padding: 4,
    borderRadius: 18,
    marginBottom: 4,
    backgroundColor: 'transparent'
  },
  myImageBubble: {
    alignSelf: 'flex-end'
  },
  otherImageBubble: {
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
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent'
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#000'
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
  brokenImageContainer: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    minHeight: 120,
    paddingVertical: 15,
    borderRadius: 8,
  },
  brokenImageText: {
    fontSize: 32,
    marginBottom: 8,
  },
  brokenImageSubText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default React.memo(ImageMessage);