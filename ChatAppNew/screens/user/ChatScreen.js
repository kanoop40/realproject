import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPrivateChat } from '../../service/api';
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import NotificationService from '../../service/notificationService';
import ProgressLoadingScreen from '../../components/ProgressLoadingScreen';
import useProgressLoading from '../../hooks/useProgressLoading';

const ChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, reconnectSocket } = useSocket();
  const { user: authUser, loading: authLoading, login } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [popupAnimation] = useState(new Animated.Value(0));
  const { isLoading, progress, startLoading, updateProgress, stopLoading } = useProgressLoading();
  
  // ตรวจสอบว่ามี params สำหรับเปิดแชทโดยตรงหรือไม่
  const { recipientId, recipientName, recipientAvatar } = route.params || {};

  useEffect(() => {
    if (!authLoading) {
      loadCurrentUser();
    }
  }, [authLoading]);

  useEffect(() => {
    if (currentUser) {
      if (recipientId) {
        // ถ้ามี recipientId แสดงว่าต้องเปิดแชทโดยตรง
        handleDirectChat();
      } else {
        // ถ้าไม่มี recipientId ให้โหลดรายการแชท
        loadChats();
      }
    }
  }, [currentUser, recipientId]);

  // Socket listeners สำหรับ real-time updates
  useEffect(() => {
    if (socket && currentUser) {
      console.log('🔌 Setting up ChatScreen socket listeners');
      console.log('🔌 Socket status:', socket.connected ? 'connected' : 'disconnected');
      console.log('🔌 Socket ID:', socket.id);
      
      // ฟังข้อความใหม่จากทุกห้องแชท
      const handleNewMessage = (data) => {
        console.log('💬 ChatScreen received new message:', data);
        console.log('💬 Message sender:', data.message?.sender);
        console.log('💬 Current user:', currentUser._id);
        console.log('💬 Chatroom ID:', data.chatroomId);
        
        // ไม่ต้องอัพเดทถ้าเป็นข้อความของตัวเอง
        if (data.message.sender._id === currentUser._id) {
          console.log('👤 Ignoring own message in ChatScreen');
          return;
        }
        
        // รีเฟรชรายการแชทเพื่อให้ได้ unread count ที่ถูกต้องจาก server
        console.log('🔄 Refreshing chat list to get updated unread count...');
        
        // อัพเดทรายการแชทเมื่อมีข้อความใหม่ และรีเฟรชข้อมูลจาก server
        setTimeout(() => {
          loadChats();
        }, 500); // รอสักครู่เพื่อให้ server process ข้อความก่อน
        
        // อัพเดท local state แบบชั่วคราวก่อนที่จะรีเฟรช
        setChats(prevChats => {
          const updatedChats = prevChats.map(chat => {
            if (chat._id === data.chatroomId) {
              console.log('📝 Updating chat with new message:', data.chatroomId);
              
              return {
                ...chat,
                lastMessage: {
                  content: data.message.content,
                  timestamp: data.message.timestamp,
                  sender: data.message.sender
                }
              };
            }
            return chat;
          });
          return updatedChats;
        });
      };

      // ฟังการอ่านข้อความ
      const handleMessageRead = (data) => {
        console.log('👁️ Message read update received:', data);
        console.log('👁️ Chatroom ID:', data.chatroomId);
        
        // รีเฟรชรายการแชทเพื่อให้ได้ unread count ที่ถูกต้องจาก server
        console.log('🔄 Refreshing chat list to get updated unread count after read...');
        setTimeout(() => {
          loadChats();
        }, 200); // รอสักครู่เพื่อให้ server process การอ่านข้อความ
        
        // อัพเดท local state แบบชั่วคราวก่อนที่จะรีเฟรช
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
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('messageRead', handleMessageRead); // เปลี่ยนจาก messageReadUpdate เป็น messageRead

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messageRead', handleMessageRead); // เปลี่ยนจาก messageReadUpdate เป็น messageRead
      };
    }
  }, [socket, currentUser]);

  // เพิ่ม focus listener เพื่อรีเฟรชแชทเมื่อกลับมาหน้านี้
  useFocusEffect(
    useCallback(() => {
      if (currentUser && !recipientId) {
        console.log('📱 ChatScreen focused, refreshing chats...');
        loadChats();
      }
    }, [currentUser, recipientId, loadChats])
  );

  // Refresh chats when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (currentUser && !recipientId) {
        console.log('ChatScreen: Screen focused, refreshing chats...');
        loadChats();
      }
    });

    return unsubscribe;
  }, [navigation, currentUser, recipientId, loadChats]);

  const handleDirectChat = async () => {
    try {
      console.log('🔄 Handling direct chat with recipientId:', recipientId);
      
      // ใช้ createPrivateChat API เหมือนกับ SearchUserScreen
      const response = await createPrivateChat([currentUser._id, recipientId]);
      console.log('✅ Private chat response:', response);

      if (response.existing) {
        console.log('📱 Using existing chat:', response.chatroomId);
      } else {
        console.log('🆕 Created new chat:', response.chatroomId);
      }

      // นำทางไปยังหน้าแชทส่วนตัว
      navigation.replace('PrivateChat', {
        chatroomId: response.chatroomId,
        roomName: response.roomName,
        recipientId: recipientId,
        recipientName: recipientName,
        recipientAvatar: recipientAvatar
      });
      
    } catch (error) {
      console.error('❌ Error in handleDirectChat:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดแชทได้');
    }
  };

  const loadCurrentUser = async () => {
    try {
      startLoading();
      updateProgress(10); // เริ่มต้น
      
      console.log('ChatScreen: Loading current user...');
      console.log('ChatScreen: AuthUser from context:', authUser);
      
      // ตรวจสอบ token ก่อน
      const token = await AsyncStorage.getItem('userToken');
      updateProgress(20); // ได้ token
      console.log('ChatScreen: Token from storage:', token ? 'exists' : 'not found');
      
      if (!token) {
        console.log('ChatScreen: No token found, redirecting to login');
        navigation.replace('Login');
        stopLoading();
        return;
      }

      // ดึงข้อมูลจาก API เสมอ เพื่อให้แน่ใจว่าได้ข้อมูลที่ถูกต้องตาม token
      console.log('ChatScreen: Fetching current user from API...');
      updateProgress(40); // เริ่มเรียก API
      
      const response = await api.get('/users/current');
      updateProgress(60); // ได้ข้อมูลผู้ใช้
      console.log('ChatScreen: User data received from API:', response.data);
      
      // เปรียบเทียบข้อมูลจาก AuthContext และ API
      if (authUser && authUser._id !== response.data._id) {
        console.warn('⚠️ Mismatch between AuthContext and API user!');
        console.warn('AuthContext user:', authUser._id, authUser.firstName, authUser.lastName);
        console.warn('API user:', response.data._id, response.data.firstName, response.data.lastName);
        console.warn('ใช้ข้อมูลจาก API เพราะเป็นข้อมูลที่ถูกต้องตาม token');
      }

      if (response.data.role === 'admin') {
        console.log('ChatScreen: User is admin, redirecting to admin screen');
        navigation.replace('Admin');
        stopLoading();
        return;
      }

      updateProgress(80); // กำลังตั้งค่าผู้ใช้
      console.log('ChatScreen: Setting current user from API');
      setCurrentUser(response.data);
      
      // อัปเดต NotificationService ด้วยข้อมูลผู้ใช้ที่ถูกต้อง
      NotificationService.setCurrentUser(response.data);
      
      // อัพเดท AuthContext ด้วยข้อมูลที่ถูกต้องจาก API
      if (authUser && (authUser._id !== response.data._id || 
          authUser.firstName !== response.data.firstName ||
          authUser.lastName !== response.data.lastName)) {
        console.log('🔄 Updating AuthContext with correct user data from API');
        const token = await AsyncStorage.getItem('userToken');
        await login(response.data, token);
      }
      
      updateProgress(100); // เสร็จสิ้น
    } catch (error) {
      console.error('ChatScreen: Error loading user:', error);
      console.error('ChatScreen: Error response:', error.response?.data);
      if (error.response?.status === 401) {
        console.log('ChatScreen: Unauthorized, redirecting to login');
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${error.message}`);
      }
      stopLoading(); // หยุด loading เมื่อเกิดข้อผิดพลาด
    } finally {
      console.log('ChatScreen: Loading complete');
      stopLoading(500); // หยุด loading หลัง 500ms
    }
  };

  const loadChats = useCallback(async () => {
    try {
      console.log('ChatScreen: Loading chats...');
      const [chatsResponse, groupsResponse] = await Promise.all([
        api.get('/chats'),
        api.get('/groups')
      ]);
      
      console.log('ChatScreen: Chats loaded:', chatsResponse.data?.length || 0, 'chats');
      console.log('ChatScreen: Groups loaded:', groupsResponse.data?.data?.length || 0, 'groups');
      
      // รวม private chats และ group chats
      const privateChats = chatsResponse.data || [];
      const groupChats = (groupsResponse.data?.data || []).map(group => ({
        ...group,
        _id: group._id,
        roomName: group.groupName,
        isGroup: true,
        participants: group.members,
        lastMessage: group.lastMessage || null,
        unreadCount: 0 // TODO: implement unread count for groups
      }));
      
      console.log('🔍 Private chats:', privateChats.length);
      console.log('🔍 Group chats:', groupChats.length);
      console.log('🔍 Sample group chat:', groupChats[0] ? {
        id: groupChats[0]._id,
        name: groupChats[0].roomName,
        isGroup: groupChats[0].isGroup
      } : 'none');
      
      const allChats = [...privateChats, ...groupChats].sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.lastActivity || a.createdAt;
        const bTime = b.lastMessage?.timestamp || b.lastActivity || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
      
      console.log('🔍 All chats after sort:', allChats.map(chat => ({
        id: chat._id,
        name: chat.roomName || 'private',
        isGroup: chat.isGroup || false
      })));
      
      setChats(allChats);
      console.log('✅ Updated chats state with', allChats.length, 'items');
      
      // Join ทุกห้องแชทที่ user เป็นสมาชิกเพื่อรับ real-time updates
      if (joinChatroom) {
        allChats.forEach(chat => {
          console.log('🏠 Joining chatroom for real-time updates:', chat._id);
          joinChatroom(chat._id);
        });
      }
    } catch (error) {
      console.error('ChatScreen: Error loading chats:', error);
      console.error('ChatScreen: Error response:', error.response?.data);
      setChats([]);
      
      if (error.response?.status === 401) {
        Alert.alert('เซสชันหมดอายุ', 'กรุณาเข้าสู่ระบบใหม่', [
          { text: 'ตกลง', onPress: () => navigation.replace('Login') }
        ]);
      }
    }
  }, [navigation, joinChatroom]);

  const deleteChat = async (chatId) => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      console.log('🔍 Current chats in state:', chats.length, 'items');
      console.log('🔍 Chat IDs in state:', chats.map(c => c._id));
      
      // ตรวจสอบว่าเป็น group chat หรือ private chat
      const chatToDelete = chats.find(chat => chat._id === chatId);
      console.log('🔍 Found chat to delete:', chatToDelete ? {
        id: chatToDelete._id,
        name: chatToDelete.roomName || 'private',
        isGroup: chatToDelete.isGroup,
        hasIsGroupProperty: 'isGroup' in chatToDelete
      } : 'not found');
      
      // ถ้าไม่พบ chat ใน state ให้ลองทั้งสอง endpoint
      if (!chatToDelete) {
        console.log('⚠️ Chat not found in state, trying both endpoints...');
        
        // ลอง group endpoint ก่อน
        try {
          console.log('🎯 Trying group endpoint:', `/groups/${chatId}`);
          const response = await api.delete(`/groups/${chatId}`);
          console.log('✅ Chat deleted as group successfully:', response.data);
          
          // รีเฟรชรายการแชทใหม่
          console.log('🔄 Refreshing chat list after deletion...');
          await loadChats();
          
          setChatToDelete(null);
          Alert.alert('สำเร็จ', 'ลบกลุ่มแชทเรียบร้อยแล้ว');
          return;
        } catch (groupError) {
          console.log('❌ Group endpoint failed:', groupError.response?.status);
          
          // ถ้า group endpoint ไม่ได้ ลอง private chat endpoint
          try {
            console.log('🎯 Trying private chat endpoint:', `/chats/${chatId}`);
            const response = await api.delete(`/chats/${chatId}`);
            console.log('✅ Chat deleted as private chat successfully:', response.data);
            
            // รีเฟรชรายการแชทใหม่
            console.log('🔄 Refreshing chat list after deletion...');
            await loadChats();
            
            setChatToDelete(null);
            Alert.alert('สำเร็จ', 'ลบแชทส่วนตัวเรียบร้อยแล้ว');
            return;
          } catch (privateError) {
            console.log('❌ Private chat endpoint also failed:', privateError.response?.status);
            throw privateError; // ส่งต่อ error เพื่อให้ catch block ด้านล่างจัดการ
          }
        }
      }
      
      const isGroupChat = chatToDelete?.isGroup;
      
      console.log('🔍 Chat type:', isGroupChat ? 'Group Chat' : 'Private Chat');
      
      // ใช้ endpoint ที่ถูกต้องตามประเภทของแชท
      const endpoint = isGroupChat ? `/groups/${chatId}` : `/chats/${chatId}`;
      console.log('🎯 Using endpoint:', endpoint);
      
      const response = await api.delete(endpoint);
      console.log('✅ Chat deleted successfully:', response.data);
      
      // รีเฟรชรายการแชทใหม่
      console.log('🔄 Refreshing chat list after deletion...');
      await loadChats();
      
      setChatToDelete(null);
      Alert.alert('สำเร็จ', 'ลบห้องแชทเรียบร้อยแล้ว');
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      console.error('❌ Error response:', error.response?.data);
      
      let errorMessage = 'ไม่สามารถลบห้องแชทได้';
      if (error.response?.status === 403) {
        errorMessage = 'คุณไม่มีสิทธิ์ลบห้องแชทนี้';
      } else if (error.response?.status === 404) {
        errorMessage = 'ไม่พบห้องแชทที่ต้องการลบ';
        // ลบออกจาก state ถ้าไม่พบในเซิร์ฟเวอร์
        setChats(prev => prev.filter(chat => chat._id !== chatId));
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    }
  };

  const handleLongPressChat = (chat) => {
    setChatToDelete(chat);
    Alert.alert(
      'ลบห้องแชท',
      `คุณต้องการลบห้องแชท "${chat.roomName || 'แชทส่วนตัว'}" หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          style: 'destructive',
          onPress: () => deleteChat(chat._id)
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
    }
  };

  const createGroup = () => {
    navigation.navigate('CreateGroup');
    closePopup();
  };

  const openPopup = () => {
    setShowPopup(true);
    Animated.timing(popupAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const closePopup = () => {
    Animated.timing(popupAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setShowPopup(false);
    });
  };

  const navigateToSearch = () => {
    navigation.navigate('Search');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleChatPress = async (chat) => {
    if (chat.isGroup) {
      // นำทางไปยังหน้าแชทกลุ่ม
      navigation.navigate('GroupChat', {
        groupId: chat._id,
        groupName: chat.roomName,
        groupImage: chat.groupImage
      });
    } else {
      // หาผู้ใช้อื่นที่ไม่ใช่ตัวเอง
      const otherParticipant = chat.participants?.find(p => p._id !== currentUser._id);
      
      console.log('🔗 Opening chat with participant:', otherParticipant);
      console.log('🔗 Chat room name:', chat.roomName);
      
      // มาร์คข้อความว่าอ่านแล้วเมื่อเข้าแชท
      if (chat.unreadCount > 0) {
        try {
          console.log('📖 Marking chat as read:', chat._id, 'unreadCount:', chat.unreadCount);
          await api.put(`/chats/${chat._id}/read`);
          
          // อัพเดท local state
          setChats(prevChats => {
            return prevChats.map(c => {
              if (c._id === chat._id) {
                console.log('📖 Local state updated - unreadCount reset to 0 for:', c._id);
                return { ...c, unreadCount: 0 };
              }
              return c;
            });
          });
          
          console.log('✅ Marked chat as read:', chat._id);
        } catch (error) {
          console.error('❌ Error marking chat as read:', error);
        }
      }
      
      navigation.navigate('PrivateChat', {
        chatroomId: chat._id,
        roomName: chat.roomName,
        recipientId: otherParticipant?._id,
        recipientName: otherParticipant ? 
          `${otherParticipant.firstName} ${otherParticipant.lastName}` : 
          'แชทส่วนตัว',
        recipientAvatar: otherParticipant?.avatar
      });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChatItem = useCallback(({ item }) => {
    if (item.isGroup) {
      // Render group chat item
      return (
        <TouchableOpacity 
          style={[
            styles.chatItem,
            item.unreadCount > 0 && styles.chatItemUnread
          ]}
          onPress={() => handleChatPress(item)}
          onLongPress={() => handleLongPressChat(item)}
          delayLongPress={500}
        >
          <View style={styles.avatarContainer}>
            {item.groupAvatar ? (
              <Image
                source={{ 
                  uri: item.groupAvatar.startsWith('http') 
                    ? item.groupAvatar 
                    : `${API_URL}/${item.groupAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
                }}
                style={styles.avatar}
                defaultSource={require('../../assets/default-avatar.png')}
                onError={(error) => {
                  console.log('❌ Group avatar load error:', error.nativeEvent);
                  console.log('❌ Group avatar URL:', item.groupAvatar.startsWith('http') 
                    ? item.groupAvatar 
                    : `${API_URL}/${item.groupAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`);
                }}
                onLoad={() => {
                  console.log('✅ Group avatar loaded successfully:', item.groupAvatar);
                }}
              />
            ) : (
              <View style={[styles.avatar, styles.groupAvatar]}>
                <Text style={styles.groupAvatarText}>
                  👥
                </Text>
              </View>
            )}
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
              {item.roomName} ({item.participants?.length || 0})
            </Text>
            <Text style={styles.groupSubtitle}>
              {item.participants?.length || 0} สมาชิก
            </Text>
            {item.lastMessage && (
              <Text style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.lastMessageUnread
              ]} numberOfLines={1}>
                {item.lastMessage.sender?.firstName ? 
                  `${item.lastMessage.sender.firstName}: ${item.lastMessage.content}` : 
                  item.lastMessage.content
                }
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
    } else {
      // Render private chat item (existing code)
      const otherParticipant = item.participants?.find(p => p._id !== currentUser._id);
      
      return (
        <TouchableOpacity 
          style={[
            styles.chatItem,
            item.unreadCount > 0 && styles.chatItemUnread
          ]}
          onPress={() => handleChatPress(item)}
          onLongPress={() => handleLongPressChat(item)}
          delayLongPress={500}
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
                defaultSource={require('../../assets/default-avatar.png')}
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
    }
  }, [currentUser]);

  if (isLoading || authLoading) {
    return (
      <ProgressLoadingScreen
        isVisible={isLoading || authLoading}
        progress={progress}
        title={authLoading ? "กำลังตรวจสอบผู้ใช้..." : "กำลังโหลดข้อมูล..."}
        subtitle="กรุณารอสักครู่"
        color="#F5C842"
      />
    );
  }

  // Debug info
  console.log('ChatScreen render:', {
    currentUser: currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser._id})` : 'null',
    authUser: authUser ? `${authUser.firstName} ${authUser.lastName} (${authUser._id})` : 'null',
    chatsCount: chats.length,
    recipientId,
    isLoading,
    authLoading,
    socketConnected: socket ? 'connected' : 'disconnected',
    socketId: socket?.id || 'no-id'
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={navigateToSearch}
          style={styles.iconButton}
        >
          <Text style={styles.headerIcon}>🔍</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>แชท</Text>

        <TouchableOpacity 
          onPress={navigateToProfile}
          style={styles.iconButton}
        >
          <Text style={styles.headerIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>ยังไม่มีข้อความ</Text>
          <Text style={styles.subText}>
            ค้นหาเพื่อนเพื่อเริ่มแชท
          </Text>
          {/* Debug info */}
          <Text style={styles.debugText}>
            User: {currentUser?.firstName} {currentUser?.lastName} ({currentUser?._id?.slice(-6)}) | Chats: {chats.length}
          </Text>
          <Text style={styles.debugText}>
            AuthUser: {authUser?.firstName} {authUser?.lastName} ({authUser?._id?.slice(-6)})
          </Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={navigateToSearch}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchButtonText}>ค้นหาเพื่อน</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          style={styles.chatsList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
          getItemLayout={(data, index) => (
            {length: 80, offset: 80 * index, index}
          )}
        />
      )}

      

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={openPopup}
      >
        <Text style={styles.floatingIcon}>⋮</Text>
      </TouchableOpacity>

      {/* Popup Modal */}
      {showPopup && (
        <View style={styles.popupOverlay}>
          <TouchableOpacity 
            style={styles.popupBackground}
            onPress={closePopup}
          />
          <Animated.View 
            style={[
              styles.popupContainer,
              {
                transform: [
                  {
                    translateY: popupAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.popupItem}
              onPress={createGroup}
            >
              <Text style={styles.menuIcon}>👥</Text>
              <Text style={styles.popupText}>สร้างกลุ่ม</Text>
            </TouchableOpacity>
            
            <View style={styles.popupDivider} />
            
            <TouchableOpacity 
              style={styles.popupItem}
              onPress={() => {
                closePopup();
                setTimeout(() => {
                  Alert.alert(
                    'ออกจากระบบ',
                    'คุณต้องการออกจากระบบหรือไม่?',
                    [
                      { text: 'ยกเลิก', style: 'cancel' },
                      { text: 'ออกจากระบบ', style: 'destructive', onPress: handleLogout }
                    ]
                  );
                }, 300);
              }}
            >
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={[styles.popupText, { color: '#ff3b30' }]}>ออกจากระบบ</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff' // เปลี่ยนเป็นสีเหลือง
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5C842' // เปลี่ยนเป็นสีเหลือง
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
    borderBottomWidth: 0, // ลบเส้นขอบ
    borderBottomColor: 'transparent'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333' // เปลี่ยนเป็นสีเข้ม
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E6B800' // เปลี่ยนเป็นสีเหลืองเข้ม
  },
  
  // Chat List Styles
  chatsList: {
    flex: 1,
    backgroundColor: '#ffffffff' // เปลี่ยนเป็นสีเหลือง
  },
 chatItem: {
  flexDirection: 'row',
  padding: 16,
  backgroundColor: 'rgba(252, 195, 55, 0.45)' // สีเหลือง FCC337 ที่ความจาง 45%
},
  chatItemUnread: {
    backgroundColor: '#E6B800', // เปลี่ยนเป็นสีเหลืองเข้มกว่าพื้นหลัง
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500' // เปลี่ยนเป็นสีส้ม
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  defaultAvatar: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666'
  },
  groupAvatar: {
    backgroundColor: '#FFA500',
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  groupSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30', // สีแดงสดใส
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34c759'
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  chatNameUnread: {
    fontWeight: 'bold',
    color: '#000'
  },
  lastMessage: {
    fontSize: 14,
    color: '#666'
  },
  lastMessageUnread: {
    color: '#333',
    fontWeight: '500'
  },
  chatMeta: {
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  timestamp: {
    fontSize: 12,
    color: '#999'
  },
  timestampUnread: {
    color: '#007AFF',
    fontWeight: '600'
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5C842' // เปลี่ยนเป็นสีเหลือง
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 24
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA500', // เปลี่ยนเป็นสีส้ม
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginVertical: 10,
    textAlign: 'center'
  },

  // Debug Panel Styles
  debugPanel: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    minWidth: 150,
  },
  debugButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },

  // Floating Button Styles
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FFA500', // เปลี่ยนเป็นสีส้ม
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  // Popup Styles
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  popupBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popupContainer: {
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลืองเหมือนพื้นหลัง
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    minHeight: 120,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  popupText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
    fontWeight: '500',
  },
  popupDivider: {
    height: 1,
    backgroundColor: '#E6B800', // เปลี่ยนเป็นสีเหลืองเข้ม
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // Emoji Icon Styles
  headerIcon: {
    fontSize: 20,
    color: '#333', // เปลี่ยนเป็นสีเข้ม
  },
  emptyIcon: {
    fontSize: 48,
    color: '#ccc',
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
  },
  floatingIcon: {
    fontSize: 24,
    color: '#fff',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
});

export default ChatScreen;
