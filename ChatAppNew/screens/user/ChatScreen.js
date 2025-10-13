import React, { useState, useEffect, useRef } from 'react';
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
import UserChatItem from '../../components_user/UserChatItem';
import GroupChatItem from '../../components_user/GroupChatItem';
import TabBar from '../../components_user/TabBar';
import ChatItemExpandAnimation from '../../components_user/ChatItemExpandAnimation';
import ChatManager from '../../components_user/ChatManager';
// Removed loading imports - no longer using loading functionality
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const ChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, reconnectSocket } = useSocket();
  const { user: authUser, loading: authLoading, login } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true); // เพิ่ม loading state สำหรับแชท
  const [showExpandAnimation, setShowExpandAnimation] = useState(false);
  const [expandingItem, setExpandingItem] = useState(null);
  const [expandLayout, setExpandLayout] = useState(null);
  // ระบบซ่อนแชทถูกลบออกแล้ว
  const joinedChatroomsRef = useRef(new Set()); // เพิ่ม ref เพื่อ track chatrooms ที่ join แล้ว (สำหรับ iOS)
  const focusTimeRef = useRef(0); // เพิ่ม ref เพื่อ track เวลาที่ focus
  const lastLoadUserTimeRef = useRef(0); // เพิ่ม ref เพื่อ track เวลาที่โหลด user ครั้งล่าสุด
  const [serverStatus, setServerStatus] = useState('checking'); // checking, cold_start, ready, error
  // Removed loading hook - no longer using loading functionality
  
  // ตรวจสอบว่ามี params สำหรับเปิดแชทโดยตรงหรือไม่
  const { 
    recipientId, 
    recipientName, 
    recipientAvatar, 
    newChatId, 
    refresh, 
    openChatId, 
    openChatParams 
  } = route.params || {};

  // Effect สำหรับเปิดแชทอัตโนมัติ
  useEffect(() => {
    if (openChatId && openChatParams && currentUser) {
      console.log('🔄 Auto opening chat:', openChatId);
      
      // รีเฟรชรายการแชทก่อน
      const openChatDirectly = async () => {
        try {
          await loadChats();
          
          // รอให้ข้อมูลโหลดเสร็จแล้วเปิดแชท
          setTimeout(() => {
            navigation.navigate('PrivateChat', openChatParams);
          }, 500);
          
        } catch (error) {
          console.error('Error loading chats before opening:', error);
          // ถ้าโหลดไม่ได้ก็เปิดแชทต่อไป
          navigation.navigate('PrivateChat', openChatParams);
        }
      };
      
      openChatDirectly();
      
      // เคลียร์ params หลังจากใช้แล้ว
      navigation.setParams({ 
        openChatId: undefined, 
        openChatParams: undefined 
      });
    }
  }, [openChatId, openChatParams, currentUser, navigation]);

  // Effect สำหรับรีเฟรชเมื่อมี newChatId
  useEffect(() => {
    if (newChatId && refresh && currentUser) {
      console.log('🔄 New chat detected, refreshing chat list:', newChatId);
      // รีเฟรชรายการแชท
      const refreshChats = async () => {
        try {
          await loadChats();
        } catch (error) {
          console.error('Error refreshing chats:', error);
        }
      };
      refreshChats();
      
      // เคลียร์ params หลังจากใช้แล้ว
      navigation.setParams({ 
        newChatId: undefined, 
        refresh: undefined 
      });
    }
  }, [newChatId, refresh, currentUser, navigation]);

  // Cleanup effect สำหรับ iOS - reset joined chatrooms เมื่อ component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 ChatScreen unmounting, clearing joined chatrooms tracking');
      joinedChatroomsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      // ป้องกันการโหลด user บ่อยเกินไป
      const now = Date.now();
      if (now - lastLoadUserTimeRef.current > 5000) { // ห่างอย่างน้อย 5 วินาที
        lastLoadUserTimeRef.current = now;
        loadCurrentUser();
      } else {
        console.log('🚫 Skipping loadCurrentUser - too frequent');
        // ถ้ามี authUser แล้ว ให้ใช้ข้อมูลนั้นแทน
        if (authUser) {
          console.log('✅ Using existing authUser data');
          setCurrentUser(authUser);
          setServerStatus('ready');
        }
      }
      // ระบบซ่อนแชทถูกลบออกแล้ว
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

  // Refresh chats when screen comes into focus (เช่น หลังจากออกจากกลุ่ม)
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser && !recipientId) {
        console.log('🔄 ChatScreen focused - refreshing chats...');
        loadChats();
      }
    }, [currentUser, recipientId])
  );

  // Socket listeners สำหรับ real-time updates
  useEffect(() => {
    if (socket && currentUser) {
      console.log('🔌 Setting up ChatScreen socket listeners');
      console.log('🔌 Socket status:', socket.connected ? 'connected' : 'disconnected');
      console.log('🔌 Socket ID:', socket.id);
      
      // Reset joined chatrooms tracking เมื่อ socket reconnect (สำหรับ iOS)
      if (socket.connected) {
        console.log('🔄 Socket connected, resetting joined chatrooms tracking for iOS');
        joinedChatroomsRef.current.clear();
      }
      
      // ฟังข้อความใหม่จากทุกห้องแชท
      const handleNewMessage = async (data) => {
        console.log('💬 ChatScreen received new message:', data);
        console.log('💬 Message sender:', data.message?.sender);
        console.log('💬 Current user:', currentUser._id);
        console.log('💬 Chatroom ID:', data.chatroomId);
        
        // ระบบซ่อนแชทถูกลบออกแล้ว
        
        // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
        const isOwnMessage = data.message.sender._id === currentUser._id;
        
        if (!isOwnMessage) {
          // แสดงการแจ้งเตือนสำหรับข้อความใหม่ (เฉพาะข้อความของคนอื่น)
          const senderName = data.message.sender ? 
            `${data.message.sender.firstName} ${data.message.sender.lastName}` : 
            'Unknown';
          
          // ตรวจสอบว่าเป็นข้อความจากกลุ่มหรือแชทส่วนตัว
          const isGroupMessage = data.isGroup || data.groupId;
          const chatName = data.groupName || data.roomName || 'แชท';
          
          console.log('🔔 Showing notification for new message from:', senderName);
          console.log('🔔 Is group message:', isGroupMessage);
          console.log('🔔 Chat name:', chatName);
          
          // ใช้ NotificationService เพื่อแสดงการแจ้งเตือน
          const notificationTitle = isGroupMessage ? 
            `${chatName}: ${senderName}` : 
            `ข้อความจาก ${senderName}`;
          
          NotificationService.showInAppNotification(
            notificationTitle,
            data.message.content,
            { 
              senderId: data.message.sender._id,
              chatroomId: data.chatroomId,
              isGroup: isGroupMessage,
              groupName: data.groupName
            }
          );
        } else {
          console.log('👤 Processing own message in ChatScreen (no notification)');
        }
        
        // อัพเดท local state แทนการรีเฟรชจาก server
        console.log('🔄 Updating local chat list state...');
        
        const chatFound = ChatManager.updateChatListOnNewMessage(data, currentUser, setChats);
        
        // ถ้าไม่พบแชท ให้รีเฟรชจาก server
        if (!chatFound) {
          setTimeout(() => {
            const refreshChats = async () => {
              try {
                await loadChats();
              } catch (error) {
                console.error('Error refreshing chats after new message:', error);
              }
            };
            refreshChats();
          }, 500);
        }
      };

      // ฟังการอ่านข้อความ
      const handleMessageRead = (data) => {
        ChatManager.updateChatListOnMessageRead(data, setChats);
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('messageRead', handleMessageRead); // เปลี่ยนจาก messageReadUpdate เป็น messageRead

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messageRead', handleMessageRead); // เปลี่ยนจาก messageReadUpdate เป็น messageRead
      };
    }
  }, [socket, currentUser]);

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

  const loadCurrentUser = async (retryCount = 0) => {
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
      
      // Server พร้อมใช้งาน
      setServerStatus('ready');
      
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
      
    } catch (error) {
      console.error('ChatScreen: Error loading user:', error);
      console.error('ChatScreen: Error response:', error.response?.data);
      
      // Handle 429 (Too Many Requests) with retry
      if (error.response?.status === 429 && retryCount < 2) {
        console.log(`⏳ Rate limit hit, retrying in 3 seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          loadCurrentUser(retryCount + 1);
        }, 3000); // รอ 3 วินาทีแล้วลองใหม่
        return;
      }
      
      // ตรวจสอบว่าเป็น timeout หรือไม่
      if (error.message && error.message.includes('timeout')) {
        console.log('⏰ ChatScreen: API timeout detected, server might be cold starting');
        setServerStatus('cold_start');
      } else {
        setServerStatus('error');
      }
      
      if (error.response?.status === 401) {
        console.log('ChatScreen: Unauthorized, redirecting to login');
        navigation.replace('Login');
      } else if (error.response?.status === 429) {
        console.log('⚠️ Rate limit exceeded, using AuthContext data if available');
        // ถ้าถูก rate limit และมี authUser ให้ใช้ข้อมูลนั้นแทน
        if (authUser) {
          console.log('✅ Using AuthContext data due to rate limit');
          setCurrentUser(authUser);
          setServerStatus('ready');
          NotificationService.setCurrentUser(authUser);
        } else {
          Alert.alert('ข้อผิดพลาด', 'เซิร์ฟเวอร์ยุ่ง กรุณาลองใหม่ในอีกสักครู่');
        }
      } else if (!error.message.includes('timeout')) {
        // ไม่แสดง alert ถ้าเป็น timeout เพราะระบบกำลัง retry อยู่
        Alert.alert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${error.message}`);
      }
    } finally {
      console.log('ChatScreen: Loading complete');
    }
  };

  // ระบบซ่อนแชทถูกลบออกแล้ว

  const loadChats = async () => {
    try {
      setIsLoadingChats(true); // เริ่ม loading
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
        unreadCount: group.unreadCount || 0 // ใช้ unreadCount จาก server
      }));
      
      console.log('🔍 Private chats:', privateChats.length);
      console.log('🔍 Group chats:', groupChats.length);
      console.log('🔍 Group chats detail:', groupChats.map(g => ({
        id: g._id, 
        name: g.roomName, 
        members: g.participants?.length 
      })));
      
      // ปรับ logic: แสดงแชทส่วนตัวทั้งหมด ไม่กรองออกแม้ไม่มีข้อความ
      // เพราะแชทที่สร้างใหม่จากการค้นหาผู้ใช้ต้องแสดงทันที
      const filteredPrivateChats = privateChats; // แสดงแชทส่วนตัวทั้งหมด
      
      // แชทกลุ่ม: กรองเฉพาะกลุ่มที่ user เป็นสมาชิก (double-check)
      const filteredGroupChats = groupChats.filter(group => {
        const isMember = group.participants?.some(member => 
          member.user?._id === currentUser._id || member._id === currentUser._id
        );
        if (!isMember) {
          console.log('🔍 Filtering out group (not a member):', group.roomName);
        }
        return isMember;
      });
      
      const allChats = [...filteredPrivateChats, ...filteredGroupChats];
      
      // เรียงตามเวลาล่าสุด (แชทที่มีกิจกรรมล่าสุดจะอยู่บนสุด)
      const sortedChats = allChats.sort((a, b) => {
        // ใช้เวลาล่าสุดจาก lastMessage, lastActivity หรือ createdAt
        const aTime = new Date(a.lastMessage?.timestamp || a.lastActivity || a.createdAt || 0);
        const bTime = new Date(b.lastMessage?.timestamp || b.lastActivity || b.createdAt || 0);
        
        // เรียงจากใหม่สุดไปเก่าสุด
        return bTime - aTime;
      });
      
      console.log('🔍 All chats after sorting:', sortedChats.length);
      
      setChats(sortedChats);
      console.log('✅ Updated chats state with', allChats.length, 'items');
      
      // Join ทุกห้องแชทที่ user เป็นสมาชิกเพื่อรับ real-time updates
      ChatManager.joinChatrooms(allChats, joinChatroom, joinedChatroomsRef);
    } catch (error) {
      console.error('ChatScreen: Error loading chats:', error);
      console.error('ChatScreen: Error response:', error.response?.data);
      setChats([]);
      
      if (error.response?.status === 401) {
        Alert.alert('เซสชันหมดอายุ', 'กรุณาเข้าสู่ระบบใหม่', [
          { text: 'ตกลง', onPress: () => navigation.replace('Login') }
        ]);
      }
    } finally {
      setIsLoadingChats(false); // จบ loading
    }
  };

  // ระบบซ่อนแชทถูกลบออกแล้ว - เปลี่ยนเป็นระบบจัดเรียงแชท

  // ระบบซ่อนแชทถูกลบออกแล้ว - เปลี่ยนเป็นระบบจัดเรียงแชท

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
  };

  const navigateToSearch = () => {
    navigation.navigate('Search');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleChatPress = async (chat) => {
    await ChatManager.handleChatPress(chat, currentUser, setChats, navigation);
  };

  const handleChatPressWithAnimation = (chat, layout) => {
    // เก็บข้อมูล item และ layout สำหรับ animation
    setExpandingItem(chat);
    setExpandLayout(layout);
    setShowExpandAnimation(true);
  };

  const onAnimationComplete = () => {
    // ซ่อน animation และนำทางไปหน้าแชท
    setShowExpandAnimation(false);
    if (expandingItem) {
      handleChatPress(expandingItem);
    }
    // Reset states
    setExpandingItem(null);
    setExpandLayout(null);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChatItem = ({ item }) => {
    if (item.isGroup) {
      return (
        <GroupChatItem
          item={item}
          onPress={handleChatPress}
          formatTime={formatTime}
          API_URL={API_URL}
        />
      );
    } else {
      return (
        <UserChatItem
          item={item}
          currentUser={currentUser}
          onPress={handleChatPress}
          onPressWithAnimation={handleChatPressWithAnimation}
          formatTime={formatTime}
          API_URL={API_URL}
        />
      );
    }
  };

  // Debug info
  console.log('ChatScreen render:', {
    currentUser: currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser._id})` : 'null',
    authUser: authUser ? `${authUser.firstName} ${authUser.lastName} (${authUser._id})` : 'null',
    chatsCount: chats.length,
    recipientId,
    authLoading,
    socketConnected: socket ? 'connected' : 'disconnected',
    socketId: socket?.id || 'no-id'
  });

  // สร้าง loading component สำหรับใช้ในส่วนของ content
  const renderLoadingContent = () => {
    const isColdStart = serverStatus === 'cold_start';
    const loadingTitle = authLoading 
      ? "กำลังตรวจสอบผู้ใช้..." 
      : isColdStart 
        ? "เซิร์ฟเวอร์กำลังเริ่มต้น..." 
        : "กำลังโหลดข้อมูล...";
    
    const loadingSubtitle = isColdStart 
      ? "กรุณารอสักครู่ (30-60 วินาที)" 
      : "กรุณารอสักครู่";
    
    // Removed loading screen - show chat list directly
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>แชท</Text>
      </View>

      {/* Content Area - แสดง loading, empty state หรือ chat list */}
      {authLoading || isLoadingChats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>กำลังโหลดแชท...</Text>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>ยังไม่มีข้อความ</Text>
          <Text style={styles.subText}>
            ค้นหาเพื่อนเพื่อเริ่มแชท
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
          contentContainerStyle={styles.chatsListContent}
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={15}
          scrollEnabled={true}
          nestedScrollEnabled={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          alwaysBounceVertical={true}
          decelerationRate="normal"
          scrollEventThrottle={16}
          getItemLayout={null}
          onScrollToIndexFailed={() => {}}
        />
      )}

      <TabBar 
        navigation={navigation}
        handleLogout={handleLogout}
      />

      {/* Expand Animation Overlay */}
      {showExpandAnimation && expandingItem && (
        <ChatItemExpandAnimation
          isVisible={showExpandAnimation}
          onAnimationComplete={onAnimationComplete}
          originalLayout={expandLayout}
        >
          <UserChatItem
            item={expandingItem}
            currentUser={currentUser}
            onPress={() => {}}
            formatTime={formatTime}
            API_URL={API_URL}
          />
        </ChatItemExpandAnimation>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: 50,
    backgroundColor: COLORS.background,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent'
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary
  },
  iconButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSecondary,
    ...SHADOWS.sm
  },
  // Loading Content Styles
  loadingContentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Chat List Styles
  chatsList: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  chatsListContent: {
    flexGrow: 1,
    paddingBottom: 90,
  },


  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffffff' // เปลี่ยนเป็นสีเหลือง
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
    backgroundColor: '#333',
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

  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
});

export default ChatScreen;
