import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

const TextMessage = ({ 
  item, 
  index, 
  currentUser, 
  showTimeForMessages,
  timeAnimations,
  selectedMessages,
  selectionMode,
  formatDateTime,
  shouldShowTime,
  onMessagePress,
  onLongPress
}) => {
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
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          item.isOptimistic && styles.optimisticMessage,
          (item.image || (item.file && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name))) && styles.messageWithMedia,
          selectedMessages.includes(item._id) && styles.selectedMessage
        ]}
        onPress={() => onMessagePress && onMessagePress(item._id)}
        onLongPress={() => onLongPress && onLongPress(item._id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
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
          <Text style={[styles.editedText, isMyMessage ? styles.myEditedText : styles.otherEditedText]}>
            แก้ไขแล้ว
          </Text>
        )}
      </TouchableOpacity>
      
      {/* Time and status for text messages - ไม่แสดงในโหมดเลือก */}
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
  messageBubble: {
    maxWidth: '85%',
    minWidth: 'auto',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#fff',
    flexShrink: 1,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  myMessageBubble: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 12
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
    flexWrap: 'wrap',
    flexShrink: 1
  },
  myMessageText: {
    color: '#fff'
  },
  otherMessageText: {
    color: '#333'
  },
  optimisticMessage: {
    opacity: 0.7
  },
  optimisticMessageText: {
    fontStyle: 'italic'
  },
  messageWithMedia: {
    marginTop: 4,
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
  editedText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  myEditedText: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherEditedText: {
    color: '#999',
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

export default TextMessage;