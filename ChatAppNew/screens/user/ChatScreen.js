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
import { useSocket } from '../../context/SocketContext_Mock';
import { useAuth } from '../../context/AuthContext';
import NotificationService from '../../service/notificationService';
// Removed loading imports - no longer using loading functionality
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const ChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, reconnectSocket } = useSocket();
  const { user: authUser, loading: authLoading, login } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [hiddenChats, setHiddenChats] = useState([]); // เพิ่มสำหรับเก็บแชทที่ซ่อน
  const hiddenChatsRef = useRef([]); // เพิ่ม ref สำหรับ hiddenChats
  const joinedChatroomsRef = useRef(new Set()); // เพิ่ม ref เพื่อ track chatrooms ที่ join แล้ว (สำหรับ iOS)
  const focusTimeRef = useRef(0); // เพิ่ม ref เพื่อ track เวลาที่ focus
  const lastLoadUserTimeRef = useRef(0); // เพิ่ม ref เพื่อ track เวลาที่โหลด user ครั้งล่าสุด
  const [showPopup, setShowPopup] = useState(false);
  const [popupAnimation] = useState(new Animated.Value(0));
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
      loadHiddenChats(); // โหลดรายการแชทที่ซ่อน
    }
  }, [authLoading]);

  // อัพเดท hiddenChatsRef เมื่อ hiddenChats เปลี่ยน
  useEffect(() => {
    hiddenChatsRef.current = hiddenChats;
  }, [hiddenChats]);

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
        
        // ตรวจสอบว่าแชทนี้ถูกซ่อนอยู่หรือไม่ หากใช่ให้แสดงกลับ
        if (hiddenChatsRef.current.includes(data.chatroomId)) {
          console.log('🔄 Unhiding chat due to new message:', data.chatroomId);
          await unhideChat(data.chatroomId);
        }
        
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
        
        // อัพเดท local state แบบชั่วคราวก่อนที่จะรีเฟรช
        setChats(prevChats => {
          let chatFound = false;
          const updatedChats = prevChats.map(chat => {
            if (chat._id === data.chatroomId) {
              console.log('📝 Updating existing chat with new message:', data.chatroomId);
              chatFound = true;
              
              // อัปเดต unread count เฉพาะข้อความของคนอื่น (ไม่ใช่ข้อความของตัวเอง)
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
          
          // ถ้าไม่พบแชท (อาจถูกซ่อนหรือเป็นแชทใหม่) ให้รีเฟรชจาก server
          if (!chatFound) {
            console.log('📝 Chat not found in current list, will refresh:', data.chatroomId);
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
            return updatedChats;
          }
          
          // เรียงลำดับใหม่ตามเวลาข้อความล่าสุด (แชทที่มีข้อความใหม่จะขึ้นไปบนสุด)
          const sortedUpdatedChats = updatedChats.sort((a, b) => {
            const aTime = new Date(a.lastMessage?.timestamp || a.lastActivity || a.createdAt);
            const bTime = new Date(b.lastMessage?.timestamp || b.lastActivity || b.createdAt);
            return bTime - aTime; // เรียงจากใหม่สุดไปเก่าสุด
          });
          
          console.log('🔄 Re-sorted chats after message update (including own messages)');
          return sortedUpdatedChats;
        });
      };

      // ฟังการอ่านข้อความ
      const handleMessageRead = (data) => {
        console.log('👁️ Message read update received:', data);
        console.log('👁️ Chatroom ID:', data.chatroomId);
        
        // อัพเดท local state แทนการรีเฟรชจาก server
        console.log('🔄 Updating local unread count...');
        
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

  // โหลดรายการแชทที่ซ่อน
  const loadHiddenChats = async () => {
    try {
      const hidden = await AsyncStorage.getItem(`hiddenChats_${authUser?._id}`);
      if (hidden) {
        const hiddenList = JSON.parse(hidden);
        console.log('📱 Loaded hidden chats:', hiddenList);
        setHiddenChats(hiddenList);
      } else {
        console.log('📱 No hidden chats found');
        setHiddenChats([]);
      }
    } catch (error) {
      console.error('Error loading hidden chats:', error);
      setHiddenChats([]);
    }
  };

  // บันทึกรายการแชทที่ซ่อน
  const saveHiddenChats = async (hiddenList) => {
    try {
      await AsyncStorage.setItem(`hiddenChats_${authUser?._id}`, JSON.stringify(hiddenList));
    } catch (error) {
      console.error('Error saving hidden chats:', error);
    }
  };

  const loadChats = async () => {
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
      
      // กรองออกแชทที่ซ่อนไว้ (เฉพาะแชทส่วนตัว ไม่รวมแชทกลุ่ม)
      const visibleChats = allChats.filter(chat => 
        chat.isGroup || !hiddenChatsRef.current.includes(chat._id) // แชทกลุ่มแสดงเสมอ
      );
      
      // เรียงตามเวลาล่าสุด (แชทที่มีกิจกรรมล่าสุดจะอยู่บนสุด)
      const sortedChats = visibleChats.sort((a, b) => {
        // ใช้เวลาล่าสุดจาก lastMessage, lastActivity หรือ createdAt
        const aTime = new Date(a.lastMessage?.timestamp || a.lastActivity || a.createdAt || 0);
        const bTime = new Date(b.lastMessage?.timestamp || b.lastActivity || b.createdAt || 0);
        
        // เรียงจากใหม่สุดไปเก่าสุด
        return bTime - aTime;
      });
      
      console.log('🔍 All chats after filtering:', sortedChats.length);
      console.log('🔍 Hidden chats:', hiddenChatsRef.current);
      console.log('🔍 All chats before hiding filter:', allChats.length);
      console.log('🔍 Visible chats after hiding filter:', visibleChats.length);
      
      setChats(sortedChats);
      console.log('✅ Updated chats state with', allChats.length, 'items');
      
      // Join ทุกห้องแชทที่ user เป็นสมาชิกเพื่อรับ real-time updates (ป้องกันการ join ซ้ำใน iOS)
      if (joinChatroom) {
        allChats.forEach(chat => {
          if (!joinedChatroomsRef.current.has(chat._id)) {
            console.log('🏠 Joining chatroom for real-time updates:', chat._id);
            joinChatroom(chat._id);
            joinedChatroomsRef.current.add(chat._id);
          } else {
            console.log('⏭️ Skipping already joined chatroom:', chat._id);
          }
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
  };

  // ฟังก์ชันซ่อนแชท (แทนการลบ)
  const hideChat = async (chatId) => {
    try {
      console.log('� Hiding chat:', chatId);
      
      const newHiddenChats = [...hiddenChats, chatId];
      setHiddenChats(newHiddenChats);
      await saveHiddenChats(newHiddenChats);
      
      // อัปเดตรายการแชทในหน้าจอ
      setChats(prev => prev.filter(chat => chat._id !== chatId));
      
      Alert.alert('สำเร็จ', 'ซ่อนห้องแชทเรียบร้อยแล้ว');
      
    } catch (error) {
      console.error('❌ Error hiding chat:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถซ่อนห้องแชทได้');
    }
  };

  // ฟังก์ชันสำหรับแสดงแชทที่ซ่อนกลับมา (เมื่อได้รับข้อความใหม่)
  const unhideChat = async (chatId) => {
    try {
      console.log('🔄 Unhiding chat:', chatId);
      const newHiddenChats = hiddenChatsRef.current.filter(id => id !== chatId);
      setHiddenChats(newHiddenChats);
      hiddenChatsRef.current = newHiddenChats;
      await saveHiddenChats(newHiddenChats);
      console.log('✅ Chat unhidden successfully:', chatId);
      
      // รีเฟรชรายการแชทเพื่อแสดงแชทที่ unhide แล้ว
      setTimeout(() => {
        const refreshChats = async () => {
          try {
            await loadChats();
          } catch (error) {
            console.error('Error refreshing after unhide:', error);
          }
        };
        refreshChats();
      }, 100);
      
    } catch (error) {
      console.error('Error unhiding chat:', error);
    }
  };

  const handleLongPressChat = (chat) => {
    // ไม่อนุญาตให้ซ่อนแชทกลุ่ม
    if (chat.isGroup) {
      Alert.alert(
        'ไม่สามารถซ่อนได้',
        'ไม่สามารถซ่อนแชทกลุ่มได้ หากต้องการออกจากกลุ่มให้เข้าไปในแชทกลุ่ม',
        [{ text: 'ตกลง', style: 'default' }]
      );
      return;
    }
    
    Alert.alert(
      'ซ่อนห้องแชท',
      `คุณต้องการซ่อนห้องแชท "${chat.roomName || 'แชทส่วนตัว'}" หรือไม่?\n\n(แชทจะถูกซ่อนจากรายการ แต่ยังสามารถเข้าถึงได้หากมีข้อความใหม่)`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ซ่อน', 
          style: 'destructive',
          onPress: () => hideChat(chat._id)
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
      // มาร์คข้อความกลุ่มว่าอ่านแล้วเมื่อเข้าแชท
      if (chat.unreadCount > 0) {
        try {
          console.log('📖 Marking group chat as read:', chat._id, 'unreadCount:', chat.unreadCount);
          await api.put(`/groups/${chat._id}/read`);
          
          // อัพเดท local state
          setChats(prevChats => {
            const updatedChats = prevChats.map(c => {
              if (c._id === chat._id) {
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
          
          console.log('✅ Marked group chat as read:', chat._id);
        } catch (error) {
          console.error('❌ Error marking group chat as read:', error);
        }
      }
      
      // นำทางไปยังหน้าแชทกลุ่ม
      navigation.navigate('GroupChat', {
        groupId: chat._id,
        groupName: chat.roomName,
        groupImage: chat.groupImage,
        returnChatId: chat._id // เพิ่ม chatId สำหรับ unhide เมื่อกลับมา
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
        recipientAvatar: otherParticipant?.avatar,
        returnChatId: chat._id // เพิ่ม chatId สำหรับ unhide เมื่อกลับมา
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

  const renderChatItem = ({ item }) => {
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

      {/* Content Area - แสดง loading, empty state หรือ chat list */}
      {authLoading ? (
        renderLoadingContent()
      ) : chats.length === 0 ? (
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
          <Text style={styles.debugText}>
            Server: {serverStatus} | Socket: {socket?.connected ? 'connected' : 'connecting'}
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
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
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
 chatItem: {
  flexDirection: 'row',
  padding: SPACING.md,
  backgroundColor: COLORS.backgroundSecondary,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border
},
  chatItemUnread: {
    backgroundColor: COLORS.accentLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent
  },
  avatarContainer: {
    marginRight: SPACING.sm + 4,
    position: 'relative'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  defaultAvatar: {
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.textSecondary
  },
  groupAvatar: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupAvatarText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.textInverse
  },
  groupSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginBottom: 2
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.sm + 4,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  unreadText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSize.xs,
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
    backgroundColor: COLORS.success
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  chatName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  chatNameUnread: {
    fontWeight: 'bold',
    color: COLORS.textPrimary
  },
  lastMessage: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary
  },
  lastMessageUnread: {
    color: COLORS.textPrimary,
    fontWeight: '500'
  },
  chatMeta: {
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  timestamp: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary
  },
  timestampUnread: {
    color: COLORS.accent,
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
    bottom: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
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
