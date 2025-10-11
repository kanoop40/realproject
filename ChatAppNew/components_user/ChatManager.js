import PrivateChatHandler from './PrivateChatHandler';
import GroupChatHandler from './GroupChatHandler';

class ChatManager {
  static async handleChatPress(chat, currentUser, setChats, navigation) {
    if (chat.isGroup) {
      return await GroupChatHandler.handlePress(chat, setChats, navigation);
    } else {
      return await PrivateChatHandler.handlePress(chat, currentUser, setChats, navigation);
    }
  }

  static async joinChatrooms(chats, joinChatroom, joinedChatroomsRef) {
    if (joinChatroom) {
      chats.forEach(chat => {
        if (!joinedChatroomsRef.current.has(chat._id)) {
          console.log('🏠 Joining chatroom for real-time updates:', chat._id);
          joinChatroom(chat._id);
          joinedChatroomsRef.current.add(chat._id);
        } else {
          console.log('⏭️ Skipping already joined chatroom:', chat._id);
        }
      });
    }
  }

  static updateChatListOnNewMessage(data, currentUser, setChats) {
    const isOwnMessage = data.message.sender._id === currentUser._id;
    
    setChats(prevChats => {
      let chatFound = false;
      const updatedChats = prevChats.map(chat => {
        if (chat._id === data.chatroomId) {
          console.log('📝 Updating existing chat with new message:', data.chatroomId);
          chatFound = true;
          
          // อัปเดต unread count เฉพาะข้อความของคนอื่น
          const currentUnreadCount = chat.unreadCount || 0;
          const newUnreadCount = isOwnMessage ? currentUnreadCount : currentUnreadCount + 1;
          
          return {
            ...chat,
            lastMessage: {
              content: data.message.content,
              timestamp: data.message.timestamp,
              sender: data.message.sender
            },
            unreadCount: newUnreadCount
          };
        }
        return chat;
      });
      
      if (!chatFound) {
        console.log('📝 Chat not found in current list, will refresh:', data.chatroomId);
        return updatedChats;
      }
      
      // เรียงลำดับใหม่ตามเวลาข้อความล่าสุด
      const sortedUpdatedChats = updatedChats.sort((a, b) => {
        const aTime = new Date(a.lastMessage?.timestamp || a.lastActivity || a.createdAt);
        const bTime = new Date(b.lastMessage?.timestamp || b.lastActivity || b.createdAt);
        return bTime - aTime;
      });
      
      console.log('🔄 Re-sorted chats after message update');
      return sortedUpdatedChats;
    });

    return chatFound;
  }

  static updateChatListOnMessageRead(data, setChats) {
    console.log('👁️ Message read update received:', data);
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat._id === data.chatroomId) {
          console.log('👁️ Resetting unreadCount for chat:', data.chatroomId);
          return {
            ...chat,
            unreadCount: 0
          };
        }
        return chat;
      });
      return updatedChats;
    });
  }
}

export default ChatManager;