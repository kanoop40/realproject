import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';

const UserChatItem = ({ 
  item, 
  currentUser, 
  onPress, 
  formatTime, 
  API_URL,
  onPressWithAnimation 
}) => {
  const otherParticipant = item.participants?.find(p => p._id !== currentUser._id);
  const itemRef = useRef(null);

  const handlePress = () => {
    if (onPressWithAnimation && itemRef.current) {
      // Measure layout และเรียก animation
      itemRef.current.measure((x, y, width, height, pageX, pageY) => {
        const layout = { x: pageX, y: pageY, width, height };
        onPressWithAnimation(item, layout);
      });
    } else {
      onPress(item);
    }
  };

  return (
    <TouchableOpacity 
      ref={itemRef}
      style={[
        styles.chatItem,
        item.unreadCount > 0 && styles.chatItemUnread
      ]}
      onPress={handlePress}
    >
      <View style={styles.avatarContainer}>
        {otherParticipant?.avatar ? (
          <Image
            source={{ 
              uri: otherParticipant.avatar.startsWith('http') 
                ? otherParticipant.avatar 
                : `${API_URL}/${otherParticipant.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
            }}
            style={styles.avatar}
            defaultSource={require('../assets/default-avatar.jpg')}
            onError={(error) => {
              console.log('❌ Avatar load error:', error.nativeEvent);
              console.log('❌ Avatar URL:', otherParticipant.avatar.startsWith('http') 
                ? otherParticipant.avatar 
                : `${API_URL}/${otherParticipant.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}`);
            }}
            onLoad={() => {
              console.log('✅ Avatar loaded successfully:', otherParticipant.avatar);
            }}
          />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {otherParticipant?.firstName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        {/* แสดงจำนวนข้อความที่ยังไม่อ่าน */}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <Text style={[
          styles.chatName,
          item.unreadCount > 0 && styles.chatNameUnread
        ]}>
          {otherParticipant ? 
            `${otherParticipant.firstName} ${otherParticipant.lastName}` :
            'แชทส่วนตัว'
          }
        </Text>
        {item.lastMessage && (
          <Text style={[
            styles.lastMessage,
            item.unreadCount > 0 && styles.lastMessageUnread
          ]} numberOfLines={1}>
            {item.lastMessage.content}
          </Text>
        )}
      </View>
      
      <View style={styles.chatMeta}>
        {item.lastMessage && (
          <Text style={[
            styles.timestamp,
            item.unreadCount > 0 && styles.timestampUnread
          ]}>
            {formatTime(item.lastMessage.timestamp)}
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