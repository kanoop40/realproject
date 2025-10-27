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
  Animated,
  Platform
} from 'react-native';
import Lottie from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPrivateChat } from '../../service/api';
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import NotificationService from '../../service/notificationService';
import UserChatItem from '../../components_user/UserChatItem';
import GroupChatItem from '../../components_user/GroupChatItem';
import TabBar from '../../components_user/TabBar';

import SuccessTickAnimation from '../../components/SuccessTickAnimation';
import ChatManager from '../../components_user/ChatManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
// Removed loading imports - no longer using loading functionality
import LoadingOverlay from '../../components/LoadingOverlay';

const ChatScreen = ({ route, navigation }) => {
  const { user: authUser, loading: authLoading, login } = useAuth();
  const { socket, joinChatroom } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true); // เพิ่ม loading state สำหรับแชท

  // ระบบซ่อนแชทถูกลบออกแล้ว
  const joinedChatroomsRef = useRef(new Set()); // เพิ่ม ref เพื่อ track chatrooms ที่ join แล้ว (สำหรับ iOS)
  const focusTimeRef = useRef(0); // เพิ่ม ref เพื่อ track เวลาที่ focus
  const lastLoadUserTimeRef = useRef(0); // เพิ่ม ref เพื่อ track เวลาที่โหลด user ครั้งล่าสุด
  const [serverStatus, setServerStatus] = useState('checking'); // checking, cold_start, ready, error
  // Removed loading hook - no longer using loading functionality
  const [hasShownInitialAnimation, setHasShownInitialAnimation] = useState(false); // ตรวจสอบว่าแสดง animation ครั้งแรกแล้วหรือยัง
  const [showChatListAnimation, setShowChatListAnimation] = useState(false); // เริ่มต้นเป็น false
  const [showChatListContent, setShowChatListContent] = useState(true); // แสดงเนื้อหาทันทีถ้าไม่มี animation
  const [showDropdown, setShowDropdown] = useState(false); // สำหรับ dropdown menu
  const [showSuccess, setShowSuccess] = useState(false); // สำหรับ SuccessTickAnimation
  const [isSelectMode, setIsSelectMode] = useState(false); // สำหรับโหมดเลือกแชทเพื่อลบ
  const [selectedChats, setSelectedChats] = useState(new Set()); // เก็บ ID ของแชทที่เลือก
  const [notificationBanner, setNotificationBanner] = useState(null); // สำหรับแสดง notification banner
  const recentlyViewedChatsRef = useRef(new Set()); // เก็บ ID ของแชทที่เพิ่งดูมา
  
  // รับ params เฉพาะที่จำเป็น
  const { 
    recipientId, 
    recipientName, 
    recipientAvatar,
    openChatId, 
    openChatParams
  } = route.params || {};

  // Effect สำหรับเปิดแชทอัตโนมัติ (รักษาไว้เพราะยังใช้)
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

  // ลบ complex logic ทั้งหมด - ใช้ Force Refresh แทน

  // Cleanup effect สำหรับ iOS - reset joined chatrooms เมื่อ component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 ChatScreen unmounting, clearing joined chatrooms tracking');
      joinedChatroomsRef.current.clear();
      recentlyViewedChatsRef.current.clear(); // เคลียร์ recently viewed ด้วย
      
      // เคลียร์ animation flag เมื่อ ChatScreen unmount 
      // เพื่อให้เล่น animation ใหม่ในครั้งถัดไปที่เปิดแอพ
      AsyncStorage.removeItem('chatListAnimationShown');
      console.log('🎬 Cleared animation flag for next session');
    };
  }, []);

  // Load current user when auth is ready
  useEffect(() => {
    if (!authLoading && !currentUser) {
      loadCurrentUser();
    }
  }, [authLoading]);

  // ตรวจสอบ animation flag จาก AsyncStorage เมื่อ component โหลด
  useEffect(() => {
    const checkAnimationFlag = async () => {
      try {
        const animationShown = await AsyncStorage.getItem('chatListAnimationShown');
        if (animationShown === 'true') {
          console.log('🎬 Animation already shown in this session, skipping');
          setHasShownInitialAnimation(true);
          setShowChatListAnimation(false);
          setShowChatListContent(true);
        }
      } catch (error) {
        console.log('❌ Error checking animation flag:', error);
      }
    };
    
    checkAnimationFlag();
  }, []);

  // Load chats when user is ready และจัดการ animation ครั้งแรก
  useEffect(() => {
    if (!authLoading && currentUser) {
      // ถ้ายังไม่เคยแสดง animation ในเซสชันนี้ ให้แสดงครั้งเดียว
      if (!hasShownInitialAnimation) {
        setShowChatListAnimation(true);
        setShowChatListContent(false);
        setHasShownInitialAnimation(true);
        // บันทึกว่าได้แสดง animation แล้วในเซสชันนี้
        AsyncStorage.setItem('chatListAnimationShown', 'true');
      }
      loadChats();
    }
  }, [authLoading, currentUser]);

  // Real-time polling เพื่อตรวจจับข้อความใหม่ในแชทต่างๆ (ไม่ reload หน้า)
  useEffect(() => {
    let pollingInterval;

    if (currentUser && chats.length > 0 && hasShownInitialAnimation) {
      console.log('🔄 Starting ChatScreen real-time polling...');
      
      pollingInterval = setInterval(async () => {
        try {
          // โหลดข้อมูลแชทใหม่แบบเงียบๆ ไม่ให้แสดง loading
          console.log('🔄 ChatScreen: Quietly polling for chat updates...');
          
          // โหลดข้อมูลโดยไม่ trigger loading state
          await loadChatsQuietly(); 
          
        } catch (error) {
          console.log('❌ ChatScreen polling error:', error.message);
        }
      }, 10000); // ทุก 10 วินาที
    }

    return () => {
      if (pollingInterval) {
        console.log('🔄 Stopping ChatScreen real-time polling...');
        clearInterval(pollingInterval);
      }
    };
  }, [currentUser, chats.length, hasShownInitialAnimation]);

  // ตรวจสอบการเปลี่ยนแปลงของ unread count และแจ้งเตือน
  const previousUnreadRef = useRef(new Map());
  const checkForNewMessages = React.useCallback((chatsData, isInitialLoad = false) => {
    if (!chatsData || chatsData.length === 0 || !currentUser) {
      console.log('❌ Cannot check messages - missing data:', { 
        chatsData: chatsData?.length, 
        currentUser: !!currentUser 
      });
      return;
    }

    console.log('🔍 Checking for new messages...', { isInitialLoad, chatCount: chatsData.length });
    console.log('📋 Current previousUnreadRef size:', previousUnreadRef.current.size);
    
    let foundNewMessages = false;
    
    // ตรวจสอบการเปลี่ยนแปลงของ unread count
    chatsData.forEach((chat, index) => {
      const chatId = chat._id;
      const currentUnread = chat.unreadCount || 0;
      const previousUnread = previousUnreadRef.current.get(chatId);
      
      const chatName = chat.isGroup 
        ? chat.roomName 
        : chat.participants?.find(p => p._id !== currentUser._id)
          ? `${chat.participants.find(p => p._id !== currentUser._id).firstName} ${chat.participants.find(p => p._id !== currentUser._id).lastName}`
          : 'แชทส่วนตัว';

      console.log(`📊 [${index + 1}/${chatsData.length}] ${chatName}: ${previousUnread} → ${currentUnread} (ID: ${chatId})`);

      // ถ้าเป็นครั้งแรกที่โหลด ให้เก็บค่า current เป็น baseline
      if (isInitialLoad || previousUnread === undefined) {
        previousUnreadRef.current.set(chatId, currentUnread);
        console.log(`📝 Set baseline for ${chatName}: ${currentUnread}`);
        return;
      }

      // ตรวจสอบข้อความใหม่
      if (currentUnread > previousUnread) {
        foundNewMessages = true;
        const newMessageCount = currentUnread - previousUnread;
        
        console.log('🔔 NEW MESSAGE DETECTED!');
        console.log(`   Chat: ${chatName}`);
        console.log(`   Previous: ${previousUnread}, Current: ${currentUnread}`);
        console.log(`   New messages: ${newMessageCount}`);
        console.log(`   Chat type: ${chat.isGroup ? 'group' : 'private'}`);
        
        // ตรวจสอบว่าเพิ่งออกจากแชทนี้มาหรือไม่ (ภายใน 30 วินาที)
        const isRecentlyViewed = recentlyViewedChatsRef.current.has(chatId);
        console.log(`🔍 Recently viewed check for ${chatName}: ${isRecentlyViewed}`);
        console.log(`🔍 Currently recently viewed chats:`, Array.from(recentlyViewedChatsRef.current));
        
        if (isRecentlyViewed) {
          console.log('🚫 Skipping notification - recently viewed this chat');
          // ลบออกจาก recently viewed เพื่อให้แจ้งเตือนได้ในครั้งถัดไป
          recentlyViewedChatsRef.current.delete(chatId);
        } else {
          // แสดง notification banner
          setNotificationBanner({
            chatName,
            newMessages: newMessageCount,
            chatType: chat.isGroup ? 'group' : 'private',
            chatId: chatId,
            timestamp: Date.now()
          });
          
          console.log('📱 Notification banner set!');
          
          // ซ่อน banner หลังจาก 4 วินาที
          setTimeout(() => {
            console.log('🔇 Auto-hiding notification banner');
            setNotificationBanner(null);
          }, 4000);
        }
      }

      // อัพเดท previous unread count
      previousUnreadRef.current.set(chatId, currentUnread);
    });
    
    if (!foundNewMessages && !isInitialLoad) {
      console.log('✅ No new messages found in any chats');
    }
    
    console.log('📋 Updated previousUnreadRef size:', previousUnreadRef.current.size);
  }, [currentUser]);

  useEffect(() => {
    checkForNewMessages(chats);
  }, [chats, checkForNewMessages]);

    // ลบ complex logic ทั้งหมด - ใช้ Force Refresh แทน
  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading && currentUser) {
        console.log('🔄 ChatScreen focused - Force refresh chat list');
        // เมื่อกลับมาหน้านี้ ให้โหลดข้อมูลแบบเงียบๆ ไม่ต้องแสดง animation
        loadChatsQuietly();
      }
    }, [authLoading, currentUser])
  );

  // Cleanup effect สำหรับ iOS - reset joined chatrooms เมื่อ component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 ChatScreen unmounting, clearing joined chatrooms tracking');
      joinedChatroomsRef.current.clear();
    };
  }, []);

  // Load current user when auth is ready
  useEffect(() => {
    if (!authLoading && !currentUser) {
      loadCurrentUser();
    }
  }, [authLoading]);

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
    if (!currentUser) {
      console.log('ChatScreen: Cannot load chats - no current user');
      return;
    }
    
    try {
      setIsLoadingChats(true); // เริ่ม loading
      console.log('ChatScreen: Loading chats for user:', currentUser._id);
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
      
      // Log unread counts สำหรับ debug
      console.log('📬 Unread counts:', sortedChats.map(chat => ({
        name: chat.roomName || chat.isGroup ? chat.roomName : `${chat.participants?.[0]?.firstName} ${chat.participants?.[0]?.lastName}`,
        unreadCount: chat.unreadCount || 0,
        type: chat.isGroup ? 'group' : 'private'
      })));
      
      setChats(sortedChats);
      console.log('✅ Updated chats state with', allChats.length, 'items');
      
      // ตรวจสอบข้อความใหม่ (เป็นการโหลดครั้งแรก)
      checkForNewMessages(sortedChats, true);
      
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
      // เสร็จสิ้นการโหลดข้อมูลแชท
      console.log('📊 Loading chats finished');
      setIsLoadingChats(false);
      // ไม่ต้องเริ่ม animation ที่นี่ เพราะเริ่มไว้แล้วตั้งแต่ต้น
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
    navigation.navigate('SearchUser');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  // ฟังก์ชันสำหรับรีเซ็ต animation flag (สำหรับ debug)
  const resetAnimationFlag = async () => {
    try {
      await AsyncStorage.removeItem('chatListAnimationShown');
      console.log('🎬 Animation flag reset - will show animation on next load');
    } catch (error) {
      console.log('❌ Error resetting animation flag:', error);
    }
  };

  // จัดการ dropdown menu
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleCreateGroup = () => {
    setShowDropdown(false);
    navigation.navigate('CreateGroup');
  };

  const handleSelectChatsToDelete = () => {
    setShowDropdown(false);
    setIsSelectMode(true);
    setSelectedChats(new Set());
  };

  const cancelSelectMode = () => {
    setIsSelectMode(false);
    setSelectedChats(new Set());
  };

  const toggleChatSelection = (chatId) => {
    const newSelected = new Set(selectedChats);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChats(newSelected);
  };

  const hideSelectedChats = async () => {
    if (selectedChats.size === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกแชทที่ต้องการลบ');
      return;
    }

    try {
      // สร้าง array ของ chat IDs ที่จะซ่อน
      const chatIdsToHide = Array.from(selectedChats);
      
      // API call เพื่อซ่อนแชท (ไม่ลบข้อมูลจริง)
      await api.post('/chats/hide', { chatIds: chatIdsToHide });
      
      // อัพเดท state เพื่อลบแชทที่เลือกออกจากการแสดงผล
      const updatedChats = chats.filter(chat => !selectedChats.has(chat._id));
      setChats(updatedChats);
      
      // รีเซ็ต select mode
      cancelSelectMode();
      
      setShowSuccess(true);
    } catch (error) {
      console.error('Error hiding chats:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบแชทได้');
    }
  };

  // จัดการเมื่อ chat list animation เสร็จ
  const handleChatListAnimationFinish = () => {
    console.log('🎬 Chat list animation finished, showing content');
    setShowChatListAnimation(false);
    setShowChatListContent(true);
    // อัปเดต AsyncStorage เพื่อบันทึกว่าแสดง animation แล้ว
    AsyncStorage.setItem('chatListAnimationShown', 'true');
  };

  // ฟังก์ชันโหลดแชทแบบเงียบๆ (ไม่แสดง loading)
  const loadChatsQuietly = async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      console.log('🔇 Quietly loading chats for user:', currentUser._id);
      const [chatsResponse, groupsResponse] = await Promise.all([
        api.get('/chats'),
        api.get('/groups')
      ]);
      
      // รวม private chats และ group chats
      const privateChats = chatsResponse.data || [];
      const groupChats = (groupsResponse.data?.data || []).map(group => ({
        ...group,
        _id: group._id,
        roomName: group.groupName,
        isGroup: true,
        participants: group.members,
        lastMessage: group.lastMessage || null,
        unreadCount: group.unreadCount || 0
      }));
      
      console.log('📊 Raw API responses:');
      console.log('   Private chats:', privateChats.length, 'items');
      console.log('   Group chats:', groupChats.length, 'items');
      
      // Log unread counts จาก API
      console.log('📬 Unread counts from API:');
      privateChats.forEach(chat => {
        const name = chat.participants?.find(p => p._id !== currentUser._id)
          ? `${chat.participants.find(p => p._id !== currentUser._id).firstName} ${chat.participants.find(p => p._id !== currentUser._id).lastName}`
          : 'Unknown';
        console.log(`   Private: ${name} = ${chat.unreadCount || 0}`);
      });
      
      groupChats.forEach(group => {
        console.log(`   Group: ${group.roomName} = ${group.unreadCount || 0}`);
      });
      
      // แชทส่วนตัวทั้งหมด
      const filteredPrivateChats = privateChats;
      
      // แชทกลุ่มที่ user เป็นสมาชิก
      const filteredGroupChats = groupChats.filter(group => {
        const isMember = group.participants?.some(member => 
          member.user?._id === currentUser._id || member._id === currentUser._id
        );
        return isMember;
      });
      
      const allChats = [...filteredPrivateChats, ...filteredGroupChats];
      
      // เรียงตามเวลาล่าสุด
      const sortedChats = allChats.sort((a, b) => {
        const aTime = new Date(a.lastMessage?.timestamp || a.lastActivity || a.createdAt || 0);
        const bTime = new Date(b.lastMessage?.timestamp || b.lastActivity || b.createdAt || 0);
        return bTime - aTime;
      });
      
      console.log('🔇 Quietly updated chats:', sortedChats.length, 'items');
      
      // Log final unread counts ที่จะส่งไปเช็ค
      console.log('📬 Final chat data for checking:');
      sortedChats.forEach((chat, index) => {
        const name = chat.isGroup 
          ? chat.roomName 
          : chat.participants?.find(p => p._id !== currentUser._id)
            ? `${chat.participants.find(p => p._id !== currentUser._id).firstName} ${chat.participants.find(p => p._id !== currentUser._id).lastName}`
            : 'Unknown';
        console.log(`   [${index + 1}] ${name}: unread=${chat.unreadCount || 0}, id=${chat._id}`);
      });
      
      // ตรวจสอบข้อความใหม่ก่อนอัพเดท state (ไม่ใช่การโหลดครั้งแรก)
      checkForNewMessages(sortedChats, false);
      
      // อัพเดท state โดยไม่แสดง loading
      setChats(sortedChats);
      
    } catch (error) {
      console.error('🔇 Quiet chat loading error:', error);
    }
  };

  const handleChatPress = async (chat) => {
    if (isSelectMode) {
      // ถ้าอยู่ในโหมดเลือก ให้เลือก/ยกเลิกแชท
      toggleChatSelection(chat._id);
    } else {
      // ถ้าไม่ได้อยู่ในโหมดเลือก ให้เปิดแชทปกติ
      
      // ทำการ mark messages as read ก่อนเปิดแชท
      if (chat.unreadCount && chat.unreadCount > 0) {
        try {
          console.log(`🔇 Marking messages as read for chat: ${chat.roomName || 'Private'}`);
          
          if (chat.isGroup) {
            // สำหรับ Group Chat
            await api.put(`/groups/${chat._id}/read`);
          } else {
            // สำหรับ Private Chat
            await api.put(`/chats/${chat._id}/read`);
          }
          
          // อัพเดท local state ให้ unread count เป็น 0 ทันที
          const updatedChats = chats.map(c => 
            c._id === chat._id 
              ? { ...c, unreadCount: 0 }
              : c
          );
          setChats(updatedChats);
          
          // อัพเดท previousUnreadRef ด้วย
          previousUnreadRef.current.set(chat._id, 0);
          
          // เพิ่มแชทนี้ใน recently viewed พร้อมตั้งเวลาลบออกหลัง 30 วินาที
          recentlyViewedChatsRef.current.add(chat._id);
          console.log(`🔒 Added ${chat.roomName || 'Private'} to recently viewed for 30 seconds`);
          console.log(`🔒 Recently viewed chats now:`, Array.from(recentlyViewedChatsRef.current));
          
          setTimeout(() => {
            recentlyViewedChatsRef.current.delete(chat._id);
            console.log(`🕐 Removed ${chat.roomName || 'Private'} from recently viewed`);
          }, 30000); // 30 วินาที
          
          // ซ่อน notification banner ถ้ากำลังแสดงสำหรับแชทนี้
          if (notificationBanner && notificationBanner.chatId === chat._id) {
            setNotificationBanner(null);
          }
          
          console.log('✅ Messages marked as read and UI updated');
          
        } catch (error) {
          console.error('❌ Error marking messages as read:', error);
        }
      }
      
      await ChatManager.handleChatPress(chat, currentUser, setChats, navigation);
    }
  };

  // ลบฟังก์ชัน animation ออกแล้ว - ใช้การเข้าแชทแบบตรง

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChatItem = ({ item }) => {
    const isSelected = selectedChats.has(item._id);
    const hasUnreadMessages = (item.unreadCount || 0) > 0;
    
    if (item.isGroup) {
      return (
        <View style={[
          isSelectMode && styles.selectModeItem,
          isSelected && styles.selectedItem,
          hasUnreadMessages && styles.chatItemWithUnread
        ]}>
          {isSelectMode && (
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => toggleChatSelection(item._id)}
            >
              <Text style={styles.checkboxText}>
                {isSelected ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          )}
          {hasUnreadMessages && (
            <View style={styles.newMessageIndicator} />
          )}
          <GroupChatItem
            item={item}
            onPress={handleChatPress}
            formatTime={formatTime}
            API_URL={API_URL}
            style={isSelectMode ? { flex: 1 } : {}}
          />
        </View>
      );
    } else {
      return (
        <View style={[
          isSelectMode && styles.selectModeItem,
          isSelected && styles.selectedItem,
          hasUnreadMessages && styles.chatItemWithUnread
        ]}>
          {isSelectMode && (
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => toggleChatSelection(item._id)}
            >
              <Text style={styles.checkboxText}>
                {isSelected ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          )}
          {hasUnreadMessages && (
            <View style={styles.newMessageIndicator} />
          )}
          <UserChatItem
            item={item}
            currentUser={currentUser}
            onPress={handleChatPress}
            formatTime={formatTime}
            API_URL={API_URL}
            style={isSelectMode ? { flex: 1 } : {}}
          />
        </View>
      );
    }
  };

  // Debug info
  console.log('ChatScreen render:', {
    currentUser: currentUser ? (currentUser.firstName + ' ' + currentUser.lastName + ' (' + currentUser._id + ')') : 'null',
    authUser: authUser ? `${authUser.firstName} ${authUser.lastName} (${authUser._id})` : 'null',
    chatsCount: chats.length,
    recipientId,
    authLoading,
    isLoadingChats,
    showChatListAnimation,
    showChatListContent,
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
    <TouchableOpacity 
      style={styles.container}
      activeOpacity={1}
      onPress={() => {
        if (showDropdown) {
          setShowDropdown(false);
        }
      }}
    >
      {/* แสดง Loading หรือ Chat List Animation หรือเนื้อหา */}
      {authLoading || (isLoadingChats && !hasShownInitialAnimation) ? (
        <LoadingOverlay 
          visible={true} 
          message={authLoading ? "กำลังตรวจสอบผู้ใช้..." : "กำลังโหลดแชท..."} 
        />
      ) : (showChatListAnimation && !showChatListContent) ? (
        <View style={styles.animationContainer}>
          {console.log('🎭 Rendering animation component', { showChatListAnimation, showChatListContent })}
          <TouchableOpacity 
            onPress={handleChatListAnimationFinish}
            style={styles.animationTouchable}
            activeOpacity={0.8}
          >
            <Lottie
              source={require('../../assets/Community V2.json')}
              autoPlay={true}
              loop={true}
              speed={0.8}
              style={styles.chatListAnimation}
              onAnimationFinish={handleChatListAnimationFinish}
            />
          </TouchableOpacity>
          <Text style={styles.skipHintText}>แตะเพื่อข้าม</Text>
        </View>
      ) : (
        <>
          {/* Notification Banner */}
          {notificationBanner && (
            <TouchableOpacity 
              style={styles.notificationBanner}
              activeOpacity={0.8}
              onPress={() => {
                // เปิดแชทที่มีข้อความใหม่
                const targetChat = chats.find(chat => chat._id === notificationBanner.chatId);
                if (targetChat) {
                  setNotificationBanner(null);
                  handleChatPress(targetChat);
                }
              }}
            >
              <View style={styles.notificationContent}>
                <Text style={styles.notificationIcon}>
                  {notificationBanner.chatType === 'group' ? '👥' : '💬'}
                </Text>
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>ข้อความใหม่</Text>
                  <Text style={styles.notificationSubtitle}>
                    {notificationBanner.newMessages} ข้อความใหม่จาก {notificationBanner.chatName}
                  </Text>
                  <Text style={styles.notificationHint}>แตะเพื่อเปิดแชท</Text>
                </View>
                <TouchableOpacity 
                  style={styles.notificationClose}
                  onPress={(e) => {
                    e.stopPropagation();
                    setNotificationBanner(null);
                  }}
                >
                  <Text style={styles.notificationCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isSelectMode ? ('เลือกแล้ว ' + selectedChats.size + ' รายการ') : (() => {
                const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
                return totalUnread > 0 ? ('แชท (' + totalUnread + ')') : 'แชท';
              })()}
            </Text>
            
            {/* ปุ่ม dropdown หรือปุ่มยกเลิก/ลบ */}
            {isSelectMode ? (
              <View style={styles.selectModeButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={cancelSelectMode}
                >
                  <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.deleteButton, selectedChats.size === 0 && styles.deleteButtonDisabled]}
                  onPress={hideSelectedChats}
                  disabled={selectedChats.size === 0}
                >
                  <Text style={styles.deleteButtonText}>ลบ</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={toggleDropdown}
                >
                  <Text style={styles.dropdownIcon}>⋮</Text>
                </TouchableOpacity>
                
                {showDropdown && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity 
                      style={styles.dropdownItem}
                      onPress={handleCreateGroup}
                    >
                      <Text style={styles.dropdownItemIcon}>👥</Text>
                      <Text style={styles.dropdownItemText}>สร้างกลุ่ม</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.dropdownItem}
                      onPress={handleSelectChatsToDelete}
                    >
                      <Text style={styles.dropdownItemIcon}>🗑️</Text>
                      <Text style={styles.dropdownItemText}>เลือกแชทเพื่อลบ</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Content Area - แสดงเฉพาะ chat list (ไม่แสดง empty state) */}
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
        </>
      )}



      <SuccessTickAnimation
        visible={showSuccess}
        onComplete={() => setShowSuccess(false)}
      />
    </TouchableOpacity>
  );
}

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
    paddingBottom: Platform.OS === 'android' ? 100 : 90, // เพิ่มพื้นที่สำหรับ Android
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

  // Animation Styles
  animationContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    minHeight: '100%', // ให้เต็มหน้าจอ
  },
  animationTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20, // เพิ่ม padding เพื่อให้คลิกง่าย
  },
  chatListAnimation: {
    width: 350, // เพิ่มจาก 300
    height: 350, // เพิ่มจาก 300
  },
  skipHintText: {
    fontSize: TYPOGRAPHY.fontSize.md, // เพิ่มจาก sm
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl, // เพิ่มจาก lg
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.9)', // เพิ่มพื้นหลัง
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Dropdown Styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
  },
  dropdownIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },

  // Select Mode Styles
  selectModeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  deleteButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  selectModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },

  // New message indicator styles
  chatItemWithUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  newMessageIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    zIndex: 1,
  },

  // Notification Banner Styles
  notificationBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 2,
  },
  notificationHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  notificationClose: {
    padding: 6,
  },
  notificationCloseText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});

const ChatScreenWithTabBar = (props) => (
  <>
    <ChatScreen {...props} />
    <TabBar navigation={props.navigation} activeTab="Chat" />
  </>
);

export default ChatScreenWithTabBar;
