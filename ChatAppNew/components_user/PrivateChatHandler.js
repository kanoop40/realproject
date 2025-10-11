import api from '../service/api';

class PrivateChatHandler {
  static async markAsRead(chatId, setChats) {
    try {
      console.log('📖 Marking private chat as read:', chatId);
      await api.put(`/chats/${chatId}/read`);
      
      // อัพเดท local state
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === chatId) {
            console.log('📖 Local state updated - private unreadCount reset to 0 for:', c._id);
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
      });
      
      console.log('✅ Marked private chat as read:', chatId);
    } catch (error) {
      console.error('❌ Error marking private chat as read:', error);
    }
  }

  static prepareNavigationParams(chat, currentUser) {
    const otherParticipant = chat.participants?.find(p => p._id !== currentUser._id);
    
    console.log('🔗 Opening private chat with participant:', otherParticipant);
    console.log('🔗 Chat room name:', chat.roomName);
    
    return {
      chatroomId: chat._id,
      roomName: chat.roomName,
      recipientId: otherParticipant?._id,
      recipientName: otherParticipant ? 
        `${otherParticipant.firstName} ${otherParticipant.lastName}` : 
        'แชทส่วนตัว',
      recipientAvatar: otherParticipant?.avatar,
      returnChatId: chat._id
    };
  }

  static async handlePress(chat, currentUser, setChats, navigation) {
    // มาร์คข้อความว่าอ่านแล้วเมื่อเข้าแชท
    if (chat.unreadCount > 0) {
      await this.markAsRead(chat._id, setChats);
    }
    
    // เตรียม navigation params และนำทาง
    const params = this.prepareNavigationParams(chat, currentUser);
    navigation.navigate('PrivateChat', params);
  }
}

export default PrivateChatHandler;