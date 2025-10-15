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
  const showTime = shouldShowTime && shouldShowTime(item._id);

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
            // ในโหมดจัดการแชท ให้เลือกข้อความแทนการเปิดรูป
            onMessagePress && onMessagePress(item._id);
          } else {
            // โหมดปกติ แสดงเวลา และเปิดรูป
            onMessagePress && onMessagePress(item._id);
            const imageUri = item.image?.file_path || 
                            item.image?.uri ||
                            (item.file && item.file.url && item.file.url.startsWith('http') ? 
                              item.file.url : 
                              (item.file ? `${API_URL}${item.file.url || item.file.file_path}` : ''));
            setTimeout(() => onImagePress && onImagePress(imageUri), 200);
          }
        }}
        onLongPress={() => onLongPress && onLongPress(item._id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {/* Check if we have actual image data */}
          {(item.image?.file_path || item.image?.uri || item.file?.url || item.file?.file_path) ? (
            <Image
              source={{ 
                uri: item.image?.file_path || 
                     item.image?.uri ||
                     (item.file && item.file.url && item.file.url.startsWith('http') ? 
                       item.file.url : 
                       (item.file ? `${API_URL}${item.file.url || item.file.file_path}` : ''))
              }}
              style={styles.messageImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Image load error:', error.nativeEvent?.error || error);
              }}
              onLoad={() => {
                console.log('Image loaded successfully');
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
      
      {/* Time and status for images */}
      {showTimeForMessages.has(item._id) && (
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
                {/* Debug info in development */}
                {__DEV__ && (
                  <Text style={{fontSize: 8, color: 'gray', marginLeft: 5}}>
                    {`[IMG:${String(item.isRead)}]`}
                  </Text>
                )}
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
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  myImageBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-end',
  },
  otherImageBubble: {
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
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent'
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: 'transparent'
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

export default ImageMessage;