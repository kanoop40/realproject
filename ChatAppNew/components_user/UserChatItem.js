import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';
import { AvatarImage } from '../utils/avatarUtils';

const UserChatItem = ({ 
  item, 
  currentUser, 
  onPress, 
  formatTime, 
  API_URL,
  onPressWithAnimation 
}) => {
  const [chatData, setChatData] = useState(item);
  const otherParticipant = chatData.participants?.find(p => p._id !== currentUser._id);
  const itemRef = useRef(null);

  // Update local state เมื่อ props เปลี่ยน
  useEffect(() => {
    setChatData(item);
  }, [item]);

  const handlePress = () => {
    if (onPressWithAnimation && itemRef.current) {
      // Measure layout และเรียก animation
      itemRef.current.measure((x, y, width, height, pageX, pageY) => {
        const layout = { x: pageX, y: pageY, width, height };
        onPressWithAnimation(chatData, layout);
      });
    } else {
      onPress(chatData);
    }
  };

  return (
    <TouchableOpacity 
      ref={itemRef}
      style={[
        styles.chatItem,
        chatData.unreadCount > 0 && styles.chatItemUnread
      ]}
      onPress={handlePress}
    >
      <View style={styles.avatarContainer}>
        <AvatarImage 
          avatar={otherParticipant?.avatar} 
          name={otherParticipant?.firstName} 
          size={50} 
          style={styles.avatar}
        />
        {/* แสดงจำนวนข้อความที่ยังไม่อ่าน */}
        {chatData.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {chatData.unreadCount > 99 ? '99+' : chatData.unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <Text style={[
          styles.chatName,
          chatData.unreadCount > 0 && styles.chatNameUnread
        ]}>
          {otherParticipant ? 
            `${otherParticipant.firstName} ${otherParticipant.lastName}` :
            'แชทส่วนตัว'
          }
        </Text>
        {chatData.lastMessage && (
          <Text style={[
            styles.lastMessage,
            chatData.unreadCount > 0 && styles.lastMessageUnread
          ]} numberOfLines={1}>
            {chatData.lastMessage.content}
          </Text>
        )}
      </View>
      
      <View style={styles.chatMeta}>
        {chatData.lastMessage && (
          <Text style={[
            styles.timestamp,
            chatData.unreadCount > 0 && styles.timestampUnread
          ]}>
            {formatTime(chatData.lastMessage.timestamp)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  chatItemUnread: {
    backgroundColor: COLORS.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
  },
  defaultAvatar: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  unreadText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  chatNameUnread: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: '500',
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  timestampUnread: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default UserChatItem;