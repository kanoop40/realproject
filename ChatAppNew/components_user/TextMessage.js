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
  formatDateTime,
  shouldShowTime,
  onMessagePress,
  onLongPress
}) => {
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
      
      {/* Time and status for text messages */}
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
    maxWidth: '80%',
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1
  },
  myMessageBubble: {
    backgroundColor: '#000000',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    marginRight: 8
  },
  otherMessageBubble: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    marginLeft: 8
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400'
  },
  myMessageText: {
    color: '#ffffff'
  },
  otherMessageText: {
    color: '#1f2937'
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