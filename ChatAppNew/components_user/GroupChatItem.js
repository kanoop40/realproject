import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS } from '../styles/theme';
import { AvatarImage } from '../service/avatarUtils';

const GroupChatItem = ({ 
  item, 
  onPress, 
  formatTime, 
  API_URL 
}) => {
  const [groupData, setGroupData] = useState(item);

  // Update local state เมื่อ props เปลี่ยน
  useEffect(() => {
    console.log('🏷️ GroupChatItem data:', {
      id: item._id,
      roomName: item.roomName,
      groupName: item.groupName,
      membersCount: item.participants?.length || 0,
      lastMessage: item.lastMessage ? {
        content: item.lastMessage.content,
        sender: item.lastMessage.sender,
        messageType: item.lastMessage.messageType
      } : null,
      unreadCount: item.unreadCount
    });
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
          avatarPath={groupData.groupAvatar} 
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
        {/* บรรทัดแรก: ชื่อกลุ่มพร้อมจำนวนสมาชิก */}
        <Text style={[
          styles.chatName,
          groupData.unreadCount > 0 && styles.chatNameUnread
        ]}>
          {`${groupData.roomName || groupData.groupName || 'กลุ่มไม่มีชื่อ'} (${groupData.participants?.length || 0})`}
        </Text>
        
        {/* บรรทัดที่สง: ข้อความล่าสุดพร้อมเวลา */}
        <View style={styles.lastMessageRow}>
          {groupData.lastMessage ? (
            <>
              <Text style={[
                styles.lastMessage,
                groupData.unreadCount > 0 && styles.lastMessageUnread
              ]} numberOfLines={1}>
                {(() => {
                  const message = groupData.lastMessage;
                  console.log('🔍 Last message data:', {
                    sender: message.sender,
                    content: message.content,
                    messageType: message.messageType,
                    timestamp: message.timestamp
                  });
                  
                  let senderName = 'ไม่ทราบชื่อ';
                  
                  // ดึงชื่อผู้ส่งจากหลายรูปแบบข้อมูล
                  if (message.sender) {
                    if (typeof message.sender === 'object' && message.sender !== null) {
                      senderName = message.sender.firstName || message.sender.name || message.sender.username || 'ไม่ทราบชื่อ';
                    } else if (typeof message.sender === 'string') {
                      senderName = message.sender;
                    }
                  }
                  
                  // จัดรูปแบบข้อความตามประเภท
                  let messageContent = '';
                  if (message.messageType === 'image') {
                    messageContent = '📷 รูปภาพ';
                  } else if (message.messageType === 'file') {
                    messageContent = '📎 ไฟล์แนบ';
                  } else {
                    messageContent = message.content || 'ข้อความ';
                  }
                  
                  // รูปแบบ: "คนส่ง : ข้อความที่ส่ง"
                  return `${senderName} : ${messageContent}`;
                })()}
              </Text>
              <Text style={[
                styles.timestamp,
                groupData.unreadCount > 0 && styles.timestampUnread
              ]}>
                {formatTime(groupData.lastMessage.timestamp)}
              </Text>
            </>
          ) : (
            <Text style={styles.noMessage}>
              ยังไม่มีข้อความในกลุ่ม
            </Text>
          )}
        </View>
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
    marginBottom: 6,
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
  memberCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 4,
    fontWeight: '500',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
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
    flex: 1,
    marginRight: 8,
  },
  noMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  lastMessageUnread: {
    color: COLORS.text,
    fontWeight: '500',
  },

  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flexShrink: 0,
  },
  timestampUnread: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default GroupChatItem;