import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';
import { AvatarImage } from '../utils/avatarUtils';

const GroupChatItem = ({ 
  item, 
  onPress, 
  formatTime, 
  API_URL 
}) => {
  const [groupData, setGroupData] = useState(item);

  // Update local state เมื่อ props เปลี่ยน
  useEffect(() => {
    setGroupData(item);
  }, [item]);

  return (
    <TouchableOpacity 
      style={[
        styles.chatItem,
        groupData.unreadCount > 0 && styles.chatItemUnread
      ]}
      onPress={() => onPress(groupData)}
    >
      <View style={styles.avatarContainer}>
        <AvatarImage 
          avatar={groupData.groupAvatar} 
          name={groupData.groupName} 
          size={50} 
          style={styles.avatar}
        />
        {groupData.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {groupData.unreadCount > 99 ? '99+' : groupData.unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <Text style={[
          styles.chatName,
          groupData.unreadCount > 0 && styles.chatNameUnread
        ]}>
          {groupData.roomName} ({groupData.participants?.length || 0})
        </Text>
        
        {/* แสดงรายชื่อสมาชิก */}
        <Text style={styles.membersList} numberOfLines={1}>
          {groupData.participants?.slice(0, 3).map((member, index) => {
            const name = member.user ? 
              `${member.user.firstName} ${member.user.lastName}` : 
              `${member.firstName} ${member.lastName}`;
            return index === 0 ? name : `, ${name}`;
          }).join('') || 'ไม่มีสมาชิก'}
          {groupData.participants?.length > 3 && ` และอีก ${groupData.participants.length - 3} คน`}
        </Text>
        
        {groupData.lastMessage && (
          <Text style={[
            styles.lastMessage,
            groupData.unreadCount > 0 && styles.lastMessageUnread
          ]} numberOfLines={1}>
            {groupData.lastMessage.sender && groupData.lastMessage.sender.firstName ? 
              `${groupData.lastMessage.sender.firstName}: ${groupData.lastMessage.content}` : 
              groupData.lastMessage.content
            }
          </Text>
        )}
      </View>
      
      <View style={styles.chatMeta}>
        {groupData.lastMessage && (
          <Text style={[
            styles.timestamp,
            groupData.unreadCount > 0 && styles.timestampUnread
          ]}>
            {formatTime(groupData.lastMessage.timestamp)}
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
  groupAvatar: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
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
    marginBottom: 2,
  },
  chatNameUnread: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  groupSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  membersList: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontStyle: 'italic',
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

export default GroupChatItem;