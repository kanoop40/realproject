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

const ChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, reconnectSocket } = useSocket();
  const { user: authUser, loading: authLoading, login } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [popupAnimation] = useState(new Animated.Value(0));
  
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
        
        // ไม่ต้องอัพเดทถ้าเป็นข้อความของตัวเอง
        if (data.message.sender._id === currentUser._id) {
          console.log('👤 Ignoring own message in ChatScreen');
          return;
        }
        
        // อัพเดทรายการแชทเมื่อมีข้อความใหม่
        setChats(prevChats => {
          console.log('📝 Previous chats count:', prevChats.length);
          const updatedChats = prevChats.map(chat => {
            if (chat._id === data.chatroomId) {
              console.log('📝 Updating chat with new message:', data.chatroomId);
              return {
                ...chat,
                lastMessage: {
                  content: data.message.content,
                  timestamp: data.message.timestamp,
                  sender: data.message.sender
                },
                unreadCount: (chat.unreadCount || 0) + 1
              };
            }
            return chat;
          });
          console.log('📝 Updated chats count:', updatedChats.length);
          return updatedChats;
        });
      };

      // ฟังการอ่านข้อความ
      const handleMessageRead = (data) => {
        console.log('👁️ Message read update:', data);
        
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat._id === data.chatroomId) {
              return {
                ...chat,
                unreadCount: 0
              };
            }
            return chat;
          });
        });
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('messageReadUpdate', handleMessageRead);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messageReadUpdate', handleMessageRead);
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
      console.log('ChatScreen: Loading current user...');
      console.log('ChatScreen: AuthUser from context:', authUser);
      
      // ตรวจสอบ token ก่อน
      const token = await AsyncStorage.getItem('userToken');
      console.log('ChatScreen: Token from storage:', token ? 'exists' : 'not found');
      
      if (!token) {
        console.log('ChatScreen: No token found, redirecting to login');
        navigation.replace('Login');
        return;
      }

      // ดึงข้อมูลจาก API เสมอ เพื่อให้แน่ใจว่าได้ข้อมูลที่ถูกต้องตาม token
      console.log('ChatScreen: Fetching current user from API...');
      const response = await api.get('/users/current');
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
        return;
      }

      console.log('ChatScreen: Setting current user from API');
      setCurrentUser(response.data);
      
      // อัพเดท AuthContext ด้วยข้อมูลที่ถูกต้องจาก API
      if (authUser && (authUser._id !== response.data._id || 
          authUser.firstName !== response.data.firstName ||
          authUser.lastName !== response.data.lastName)) {
        console.log('🔄 Updating AuthContext with correct user data from API');
        const token = await AsyncStorage.getItem('userToken');
        await login(response.data, token);
      }
    } catch (error) {
      console.error('ChatScreen: Error loading user:', error);
      console.error('ChatScreen: Error response:', error.response?.data);
      if (error.response?.status === 401) {
        console.log('ChatScreen: Unauthorized, redirecting to login');
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${error.message}`);
      }
    } finally {
      console.log('ChatScreen: Setting loading to false');
      setIsLoading(false);
    }
  };

  const loadChats = useCallback(async () => {
    try {
      console.log('ChatScreen: Loading chats...');
      const response = await api.get('/chats');
      console.log('ChatScreen: Chats loaded:', response.data?.length || 0, 'chats');
      console.log('ChatScreen: Chat data sample:', response.data?.[0]);
      setChats(response.data || []);
      
      // Join ทุกห้องแชทที่ user เป็นสมาชิกเพื่อรับ real-time updates
      if (joinChatroom && response.data) {
        response.data.forEach(chat => {
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
      const response = await api.delete(`/chats/${chatId}`);
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
    // TODO: Navigate to create group screen
    Alert.alert('สร้างกลุ่ม', 'ฟีเจอร์นี้จะพัฒนาต่อไป');
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
    // หาผู้ใช้อื่นที่ไม่ใช่ตัวเอง
    const otherParticipant = chat.participants?.find(p => p._id !== currentUser._id);
    
    console.log('🔗 Opening chat with participant:', otherParticipant);
    console.log('🔗 Chat room name:', chat.roomName);
    
    // มาร์คข้อความว่าอ่านแล้วเมื่อเข้าแชท
    if (chat.unreadCount > 0) {
      try {
        await api.put(`/chats/${chat._id}/read`);
        
        // อัพเดท local state
        setChats(prevChats => {
          return prevChats.map(c => {
            if (c._id === chat._id) {
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
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChatItem = useCallback(({ item }) => {
    // หาผู้ใช้อื่นที่ไม่ใช่ตัวเอง
    const otherParticipant = item.participants?.find(p => p._id !== currentUser._id);
    
    // Debug logging
    console.log('Rendering chat item:', {
      chatId: item._id,
      roomName: item.roomName,
      participants: item.participants,
      otherParticipant: otherParticipant,
      currentUserId: currentUser._id
    });
    
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
              source={{ uri: `${API_URL}/${otherParticipant.avatar.replace(/\\/g, '/')}` }}
              style={styles.avatar}
              defaultSource={require('../../assets/default-avatar.png')}
              onError={(error) => {
                console.log('❌ Avatar load error:', error.nativeEvent);
                console.log('❌ Avatar URL:', `${API_URL}/${otherParticipant.avatar.replace(/\\/g, '/')}`);
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
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
          {item.unreadCount > 0 && <View style={styles.onlineIndicator} />}
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
  }, [currentUser]);

  if (isLoading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{marginTop: 10}}>
          {authLoading ? 'กำลังโหลดข้อมูลผู้ใช้...' : 'กำลังโหลด...'}
        </Text>
      </View>
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

      {/* Debug Panel - Remove in production */}
      {__DEV__ && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugText}>
            Socket: {socket?.connected ? '🟢' : '🔴'} | ID: {socket?.id || 'none'}
          </Text>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              if (socket) {
                console.log('🧪 Testing socket emit...');
                socket.emit('test', { message: 'test from ChatScreen' });
              }
            }}
          >
            <Text style={styles.debugButtonText}>Test Socket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: '#ff9500' }]}
            onPress={() => {
              console.log('🔄 Manual reconnect...');
              if (reconnectSocket) {
                reconnectSocket();
              }
            }}
          >
            <Text style={styles.debugButtonText}>Reconnect</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  
  // Chat List Styles
  chatsList: {
    flex: 1
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  chatItemUnread: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
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
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34c759',
    borderWidth: 2,
    borderColor: '#fff'
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
    padding: 20
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // Emoji Icon Styles
  headerIcon: {
    fontSize: 20,
    color: '#007AFF',
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
