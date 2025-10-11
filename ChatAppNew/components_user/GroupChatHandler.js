import api from '../service/api';

class GroupChatHandler {
  static async markAsRead(groupId, setChats) {
    try {
      console.log('📖 Marking group chat as read:', groupId);
      await api.put(`/groups/${groupId}/read`);
      
      // อัพเดท local state
      setChats(prevChats => {
        const updatedChats = prevChats.map(c => {
          if (c._id === groupId) {
            console.log('📖 Local state updated - group unreadCount reset to 0 for:', c._id);
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
        
        // เรียงลำดับใหม่หลังจากอัปเดต
        return updatedChats.sort((a, b) => {
          const aTime = new Date(a.lastMessage?.timestamp || a.lastActivity || a.createdAt || 0);
          const bTime = new Date(b.lastMessage?.timestamp || b.lastActivity || b.createdAt || 0);
          return bTime - aTime;
        });
      });
      
      console.log('✅ Marked group chat as read:', groupId);
    } catch (error) {
      console.error('❌ Error marking group chat as read:', error);
    }
  }

  static prepareNavigationParams(chat) {
    return {
      groupId: chat._id,
      groupName: chat.roomName,
      groupImage: chat.groupImage,
      returnChatId: chat._id
    };
  }

  static async handlePress(chat, setChats, navigation) {
    // มาร์คข้อความกลุ่มว่าอ่านแล้วเมื่อเข้าแชท
    if (chat.unreadCount > 0) {
      await this.markAsRead(chat._id, setChats);
    }
    
    // เตรียม navigation params และนำทาง
    const params = this.prepareNavigationParams(chat);
    navigation.navigate('GroupChat', params);
  }
}

export default GroupChatHandler;