import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  Image, TextInput, KeyboardAvoidingView, Platform, Alert, Modal, Dimensions, Animated, RefreshControl
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
// Removed loading imports - no longer using loading functionality
import NotificationService from '../../service/notificationService';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import ChatInputBar from '../../components_user/ChatInputBar';
import GroupChatMenuButton from '../../components_user/GroupChatMenuButton';
import GroupMessageBubble from '../../components_user/GroupMessageBubble';
import LoadOlderMessagesGroupChat from '../../components_user/LoadOlderMessagesGroupChat';
import LoadingOverlay from '../../components/LoadingOverlay';
import SuccessTickAnimation from '../../components/SuccessTickAnimation';

const GroupChatScreen = ({ route, navigation }) => {
  const { user: authUser } = useAuth();
  const { socket, joinChatroom } = useSocket();
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [isScrollingToEnd, setIsScrollingToEnd] = useState(false); // ปิดการใช้งาน scroll loading
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  // Removed loading hook - no longer using loading functionality
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [showChatContent, setShowChatContent] = useState(true); // แสดงเนื้อหาแชททันที
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeForMessages, setShowTimeForMessages] = useState(new Set()); // เก็บ ID ของข้อความที่จะแสดงเวลา
  const [timeAnimations, setTimeAnimations] = useState({}); // เก็บ Animated.Value สำหรับแต่ละข้อความ
  const [messageReadCount, setMessageReadCount] = useState({}); // เก็บจำนวนคนที่อ่านข้อความแต่ละข้อความ
  const [selectionMode, setSelectionMode] = useState(false); // โหมดเลือกข้อความ
  const [selectedMessages, setSelectedMessages] = useState([]); // ข้อความที่เลือก
  const [successNotification, setSuccessNotification] = useState({ visible: false, message: '' }); // แจ้งเตือนสำเร็จ
  const [showSuccess, setShowSuccess] = useState(false); // สำหรับ SuccessTickAnimation
  
  // States สำหรับโหลดข้อความเก่า
  const [showLoadOlderButton, setShowLoadOlderButton] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // สำหรับ pull-to-refresh
  const [currentPage, setCurrentPage] = useState(1);
  const flatListRef = useRef(null);

  const { 
    groupId, 
    groupName, 
    groupAvatar, 
    refresh, 
    updatedMembers,
    forceRefresh,
    avatarUpdated,
    showInitialLoading = false,
    fromCreate = false
  } = route.params || {};

  // กำหนด initial loading state สำหรับ iOS เมื่อสร้างกลุ่มใหม่
  useEffect(() => {
    if (showInitialLoading || fromCreate) {
      console.log('🔄 Starting initial loading for iOS from group creation');
      // Loading functionality removed
    }
  }, [showInitialLoading, fromCreate]);

  // เช็ครับ refresh parameter จาก EditGroupScreen
  useEffect(() => {
    if (refresh && updatedMembers !== undefined) {
      console.log('🔄 Refreshing group data from EditGroupScreen with updated members:', updatedMembers);
      if (avatarUpdated) {
        console.log('🖼️ Avatar was updated, forcing complete refresh');
      }
      loadGroupData();
      // Reset navigation params หลังจาก refresh
      navigation.setParams({ 
        refresh: false, 
        updatedMembers: undefined, 
        forceRefresh: undefined, 
        avatarUpdated: undefined 
      });
    }
  }, [refresh, updatedMembers, forceRefresh, avatarUpdated]);

  // Debug selection mode
  useEffect(() => {

  }, [selectionMode, selectedMessages]);

  useEffect(() => {
    loadGroupData();
    // อัปเดตข้อมูลผู้ใช้ใน NotificationService
    if (authUser) {
      console.log('🔔 Setting current user in NotificationService:', authUser._id);
      NotificationService.setCurrentUser(authUser);
    } else {
      console.log('❌ No authUser found for NotificationService');
    }
  }, [authUser]);

  // เพิ่ม useEffect เพื่อตรวจสอบ Socket status เมื่อเข้าหน้า
  useEffect(() => {
    
    // HTTP API mode - no socket connection needed
    setSocketStatus('http-mode');
    console.log('🔌 GroupChat: HTTP API mode - stable connection');
  }, []);

  // Auto-scroll ไปข้อความล่าสุดเมื่อมีข้อความใหม่ (ทำงานในพื้นหลังระหว่างโหลด)
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToEnd) {
      // รอให้ FlatList render เสร็จแล้วค่อย scroll (ไม่ต้องรอ loading เสร็จ)

      
      // ใช้ requestAnimationFrame เพื่อให้แน่ใจว่า render เสร็จแล้ว
      const timeoutId = setTimeout(() => {
        const scrollToEnd = () => {
          try {
            if (messages.length > 0 && flatListRef.current) {
              flatListRef.current.scrollToEnd({ 
                animated: false
              });
            }
          } catch (error) {
            console.log('ScrollToEnd failed:', error);
          }
          setHasScrolledToEnd(true);
          // setIsScrollingToEnd(false);
        };
        requestAnimationFrame(scrollToEnd);
      }, 100); // ลดเวลา delay เหลือ 100ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, hasScrolledToEnd]); // ไม่ใส่ isLoading ใน dependency

  // เพิ่ม useEffect เพื่อ scroll ทันทีเมื่อมี messages (ไม่รอ loading)
  useEffect(() => {
    if (messages.length > 0) {
      // scroll ทันทีเมื่อมี messages โดยไม่ต้องรอ loading เสร็จ

      
      const immediateScrollTimeout = setTimeout(() => {
        try {
          if (messages.length > 0 && flatListRef.current) {
            flatListRef.current.scrollToEnd({ 
              animated: false
            });
          }
        } catch (error) {
          console.log('ScrollToEnd immediate failed:', error);
        }
      }, 50); // เริ่ม scroll เร็วมาก
      
      return () => clearTimeout(immediateScrollTimeout);
    }
  }, [messages.length]); // ไม่ใส่ isLoading ใน dependency

  // เพิ่ม useEffect เพื่อ force scroll หลังจาก component mount และมีข้อความ
  useEffect(() => {
    if (messages.length > 0) {
      // รอ 1 วินาทีแล้วลอง scroll อีกครั้ง ในกรณีที่ useEffect อื่นไม่ทำงาน
      const finalScrollTimeout = setTimeout(() => {

        try {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ 
              animated: false
            });
          }
        } catch (error) {
          console.log('Final scroll attempt failed:', error);
        }
      }, 1000);
      
      return () => clearTimeout(finalScrollTimeout);
    }
  }, [messages.length]);

  useEffect(() => {
    
    if (socket && groupId && authUser) {
      console.log('🔌 Setting up GroupChat socket listeners for group:', groupId);
      console.log('👤 Current user:', authUser._id);
      
      // Reset scroll flags เมื่อเข้าแชทใหม่
      setHasScrolledToEnd(false);
      // setIsScrollingToEnd(true);
      
      // Join chatroom ทันทีไม่ว่า socket จะ connected หรือไม่
      // เพราะถ้า socket ยังไม่ connected มันจะ queue การ join ไว้
      console.log('🔌 Attempting to join chatroom:', groupId);
      joinChatroom(groupId);
      
      const handleNewMessage = (data) => {
        console.log('💬 GroupChat received new message:', data);
        console.log('💬 Data structure:', JSON.stringify(data, null, 2));
        console.log('💬 Expected groupId:', groupId);
        console.log('💬 Received chatroomId:', data.chatroomId);
        
        if (data.chatroomId !== groupId) {
          console.log('❌ Message not for this group. Expected:', groupId, 'Got:', data.chatroomId);
          return;
        }
        

        console.log('💬 Message sender ID:', data.message?.sender?._id);
        console.log('💬 Current user ID:', authUser._id);
        
        // เพิ่มข้อความทุกข้อความที่มาจาก socket
        setMessages(prevMessages => {
          // ตรวจสอบว่าข้อความนี้มีอยู่แล้วหรือไม่
          const messageExists = prevMessages.some(msg => msg._id === data.message._id);
          console.log('💬 Socket message - exists check:', messageExists, 'Message ID:', data.message._id);
          
          if (messageExists) {
            console.log('💬 Socket message already exists, skipping');
            return prevMessages;
          }
          
          // ตรวจสอบว่ามี optimistic message ที่ควรแทนที่หรือไม่
          // (ข้อความที่ส่งจากตัวเองและยังเป็น temporary หรือ sent: true)
          const optimisticIndex = prevMessages.findIndex(msg => 
            msg.isTemporary || 
            (msg.sent && msg.sender?._id === authUser._id && !msg._id.includes('-'))
          );
          
          if (optimisticIndex !== -1 && data.message?.sender?._id === authUser._id) {
            console.log('💬 Replacing optimistic message with real socket message');
            const updatedMessages = [...prevMessages];
            updatedMessages[optimisticIndex] = {
              ...data.message,
              isTemporary: false,
              sent: false
            };
            return updatedMessages;
          }
          
          console.log('💬 Adding new socket message to state');
          const newMessages = [...prevMessages, data.message];
          
          // ปรับปรุงการ scroll ให้ใช้ scrollToIndex
          setTimeout(() => {
            try {
              if (newMessages.length > 0) {
                flatListRef.current?.scrollToIndex({ 
                  index: newMessages.length - 1, 
                  animated: true,
                  viewPosition: 1
                });
              }
            } catch (error) {
              console.error('Error scrolling to new message:', error);
              // Fallback to scrollToEnd if scrollToIndex fails
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }, 100);
          
          return newMessages;
        });

        // แสดงการแจ้งเตือนเฉพาะข้อความจากคนอื่น
        if (data.message?.sender?._id !== authUser._id) {
          const senderName = data.message?.sender ? 
            `${data.message.sender.firstName} ${data.message.sender.lastName}` : 
            'สมาชิกในกลุ่ม';
          
          console.log('🔔 About to show notification for group message');
          console.log('🔔 Sender Name:', senderName);
          console.log('🔔 Group Name:', groupName);
          console.log('🔔 Message Content:', data.message?.content);
          console.log('🔔 NotificationService currentUserId:', NotificationService.currentUserId);
          
          try {
            NotificationService.showInAppNotification(
              `💬 ${groupName || 'แชทกลุ่ม'}`,
              `${senderName}: ${data.message?.content || 'ส่งไฟล์แนบ'}`,
              { 
                type: 'group_message', 
                groupId: groupId,
                senderId: data.message?.sender?._id 
              }
            );

          } catch (error) {
            console.error('❌ Error showing notification:', error);
          }
        }
      };

      const handleMessageDeleted = (data) => {
        // รองรับทั้ง chatroomId (private chat) และ groupId (group chat)
        if (data.chatroomId === groupId || data.groupId === groupId) {
          console.log('🗑️ Message deleted via socket:', data.messageId);
          setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        }
      };

      const handleGroupMessageDeleted = (data) => {
        if (data.groupId === groupId) {
          console.log('🗑️ Group message deleted via socket:', data.messageId);
          setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        }
      };

      const handleMessageEdited = (data) => {
        if (data.groupId === groupId) {
          setMessages(prev => prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, content: data.content, editedAt: data.editedAt }
              : msg
          ));
        }
      };

      const handleMessageRead = (data) => {
        if (data.groupId === groupId) {
          setMessageReadCount(prev => ({
            ...prev,
            [data.messageId]: data.readCount || 0
          }));
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);
      socket.on('deleteGroupMessage', handleGroupMessageDeleted);
      socket.on('message_edited', handleMessageEdited);
      socket.on('message_read', handleMessageRead);
      
      console.log('🔌 Socket event listeners set up successfully');
      console.log('🔌 Socket connection status at setup:', socket.connected ? 'connected' : 'connecting...');
      console.log('🔌 Socket ID:', socket.id || 'pending');
      
      // ถ้า socket ยังไม่ connected ให้แสดงสถานะ
      if (!socket.connected) {
        console.log('⏰ Socket not connected yet, but listeners are ready');
        console.log('⏰ Server might be starting up (cold start)');
      }
      
      return () => {
        console.log('🔌 Cleaning up socket listeners for group:', groupId);
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
        socket.off('deleteGroupMessage', handleGroupMessageDeleted);
        socket.off('message_edited', handleMessageEdited);
        socket.off('message_read', handleMessageRead);
        console.log('🔌 Socket listeners cleaned up');
      };
    } else {
      console.log('❌ Socket setup skipped. Reasons:');
      console.log('   - socket exists:', !!socket);
      console.log('   - socket.connected:', socket?.connected);
      console.log('   - groupId exists:', !!groupId);
      console.log('   - authUser exists:', !!authUser);
      
      // ถ้า socket มีแต่ยังไม่ connected ให้รอและลองใหม่
      if (socket && !socket.connected && groupId && authUser) {
        console.log('⏰ Socket not connected yet, setting up retry mechanism...');
        
        const retrySetup = () => {
          if (socket.connected) {

            // Setup listeners ทันที
            socket.on('newMessage', (data) => {
              console.log('� [Retry] GroupChat received new message:', data);
              // ... rest of handleNewMessage logic
            });
          }
        };
        
        // ลอง connect ทุก 1 วินาที จนกว่าจะ connected
        const connectInterval = setInterval(() => {
          if (socket.connected) {

            clearInterval(connectInterval);
            retrySetup();
          } else {
            console.log('⏰ Still waiting for socket connection...');
          }
        }, 1000);
        
        return () => {
          clearInterval(connectInterval);
        };
      }
    }
  }, [socket, groupId, authUser]);

  // Force refresh messages เมื่อกลับมาหน้าแชทกลุ่ม (เฉพาะครั้งแรก)
  useFocusEffect(
    React.useCallback(() => {
      if (authUser && groupId && messages.length === 0) {
        console.log('� GroupChat first time load');
        loadGroupData(1, false);
      }
    }, [authUser, groupId])
  );

  // Smart Real-time Sync - ไม่ refresh หน้าจอ
  useEffect(() => {
    let realTimeInterval;
    
    if (authUser && groupId) {
      console.log('� Starting group background sync...');
      
      realTimeInterval = setInterval(async () => {
        try {
          // ใช้ lastMessageId จากข้อความล่าสุด
          const lastMessageId = messages[messages.length - 1]?._id;
          if (!lastMessageId) return;
          
          console.log('🔄 Checking for new messages after:', lastMessageId);
          const response = await api.get(`/groups/${groupId}/check-new?lastId=${lastMessageId}`);
          
          if (response.data.hasNewMessages && response.data.newMessages?.length > 0) {
            console.log('📩 New messages found:', response.data.newMessages.length);
            
            // เพิ่มข้อความใหม่ต่อท้าย (ไม่ refresh)
            setMessages(prev => [...prev, ...response.data.newMessages.reverse()]);
            
            // Auto scroll เฉพาะถ้าอยู่ใกล้ล่างสุด
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        } catch (error) {
          console.log('� Group background sync failed:', error.message);
        }
      }, 10000); // เช็คทุก 10 วินาที - ช้าลงเพื่อ debug
    }

    return () => {
      if (realTimeInterval) {
        console.log('� Stopping group background sync...');
        clearInterval(realTimeInterval);
      }
    };
  }, [authUser, groupId, messages.length]);

  // Polling ปิดไว้ชั่วคราว - ใช้ pull-to-refresh แทน
  /* 
  useEffect(() => {
    let pollInterval;
    
    if (authUser && groupId) {
      pollInterval = setInterval(() => {
        console.log('🔄 Polling for new group messages...');
        loadGroupData(1, false);
      }, 5000); // Poll ทุก 5 วินาที
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [authUser, groupId]);
  */

  const loadGroupData = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoading(true); // เริ่ม loading เมื่อโหลดหน้าแรก
        // setIsScrollingToEnd(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const [messagesRes, groupRes] = await Promise.all([
        api.get(`/groups/${groupId}/messages?page=${page}&limit=30`), // ปรับกลับเป็น 30
        page === 1 ? api.get(`/groups/${groupId}`) : Promise.resolve({ data: groupInfo })
      ]);
      
      const loadedMessages = messagesRes.data.data || messagesRes.data.messages || [];
      console.log('📨 Group messages loaded (page ' + page + '):', {
        count: loadedMessages.length,
        firstMessageId: loadedMessages[0]?._id,
        lastMessageId: loadedMessages[loadedMessages.length - 1]?._id,
        lastMessageTime: loadedMessages[loadedMessages.length - 1]?.timestamp
      });
      const groupData = groupRes.data.data || groupRes.data;
      
      if (loadedMessages.length === 0) {
        if (page === 1) {
          console.log('📨 No messages found - this is a new group chat');
          setMessages([]); // ตั้งค่าเป็น array ว่าง
          setHasScrolledToEnd(true);
        }
        setCanLoadMore(false);
        // setIsScrollingToEnd(false);
      } else {
        if (append && page > 1) {
          // เพิ่มข้อความเก่าเข้าไปด้านหน้า
          setMessages(prevMessages => [...loadedMessages, ...prevMessages]);
        } else {
          // โหลดข้อความใหม่ทั้งหมด
          setMessages(loadedMessages);
          
          // Force scroll to bottom หลังโหลดข้อความครั้งแรก
          if (page === 1) {
            setHasScrolledToEnd(false);
            setTimeout(() => {
              [50, 100, 200, 400, 600].forEach((delay) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, delay);
              });
              
              setTimeout(() => {
                setHasScrolledToEnd(true);
              }, 650);
            }, 100);
          }
        }
        
        // เช็คว่ามีข้อความเก่าเหลืออยู่อีกหรือไม่
        if (loadedMessages.length < 30) {
          setCanLoadMore(false);
        } else {
          setCanLoadMore(true);
        }
        
        // Load read counts for group chat messages
        if (!append || page === 1) {
          try {
            console.log('📊 Loading read counts for group ID:', groupId);
            
            const readCountRes = await api.get(`/chats/${groupId}/read-counts`);
            const readCountData = readCountRes.data;
            
            console.log('📊 Read counts loaded:', readCountData);
            
            // Create mapping of message ID to read count
            const readCountMap = {};
            if (readCountData.messages) {
              readCountData.messages.forEach(msgData => {
                readCountMap[msgData.messageId] = {
                  readCount: msgData.readCount,
                  totalMembers: msgData.totalMembers,
                  readStatus: msgData.readStatus,
                  isFullyRead: msgData.isFullyRead
                };
              });
            }
            
            setMessageReadCount(readCountMap);
          } catch (readError) {
            console.error('❌ Error loading read counts:', readError);
            // Fall back to using message.readCount from API
            const initialReadCount = {};
            loadedMessages.forEach(message => {
              if (message.sender?._id === authUser._id) {
                initialReadCount[message._id] = {
                  readCount: message.readCount || 0,
                  totalMembers: 0,
                  readStatus: message.readStatus || '',
                  isFullyRead: false
                };
              }
            });
            setMessageReadCount(initialReadCount);
          }
        }
      }
      console.log('📨 Messages set, total:', append ? `${messages.length} + ${loadedMessages.length}` : loadedMessages.length);
      if (page === 1) {
        setGroupInfo(groupData);
        
        // รีเซ็ต pagination states
        setCurrentPage(1);
        setCanLoadMore(true);
        console.log('📚 Initial load - canLoadMore set to true');
        
        // แปลงข้อมูลสมาชิกให้ถูกต้อง
        const members = groupData.members || [];
      const transformedMembers = members.map(member => ({
        _id: member.user?._id || member._id,
        firstName: member.user?.firstName || member.firstName,
        lastName: member.user?.lastName || member.lastName,
        name: member.user?.name || member.name,
        email: member.user?.email || member.email,
        avatar: member.user?.avatar || member.avatar,
        role: member.role || member.user?.role || 'member'
      }));
      
        setGroupMembers(transformedMembers);
        console.log('👥 Transformed members:', transformedMembers);
        console.log('👑 Group admin ID:', groupData.admin);
        console.log('🎯 Group creator ID:', groupData.creator);
        console.log('🔍 Admin member found:', transformedMembers.find(m => m._id === (groupData.admin || groupData.creator)));
        console.log('👤 Current user ID:', authUser?._id);
      }
      
      setCurrentPage(page);
      
    } catch (error) {
  console.error('Error loading group data:', error);
    } finally {
      if (page === 1) {
        setIsLoading(false);
        // setIsScrollingToEnd(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Pull-to-refresh function (แทน auto refresh ที่รบกวน)
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadGroupData(1, false);
    setIsRefreshing(false);
  }, []);

  const removeMember = async (memberId) => {
    try {
      const { removeGroupMember } = await import('../../service/api');
      await removeGroupMember(groupId, memberId);
      
      // อัปเดตข้อมูลสมาชิกใหม่
      await loadGroupData();
      
      setShowSuccess(true);
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบสมาชิกออกจากกลุ่มได้');
    }
  };

  const deleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;
    
    Alert.alert(
      'ลบข้อความ',
      `คุณต้องการลบ ${selectedMessages.length} ข้อความของคุณหรือไม่?\n(ลบจากเซิร์ฟเวอร์และทุกคนในกลุ่มจะไม่เห็นข้อความนี้)`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              // ลบข้อความจาก UI ก่อน (Optimistic Update)
              const messagesToDelete = selectedMessages.slice();
              setMessages(prevMessages => 
                prevMessages.filter(msg => !messagesToDelete.includes(msg._id))
              );
              setSelectedMessages([]);
              setSelectionMode(false);

              // ลบข้อความจาก server
              const deletePromises = messagesToDelete.map(async (messageId) => {
                try {
                  await api.delete(`/groups/${groupId}/messages/${messageId}`);

                  
                  // Emit socket event for real-time deletion
                  if (socket) {
                    socket.emit('deleteGroupMessage', {
                      messageId: messageId,
                      groupId: groupId,
                      userId: authUser._id
                    });
                  }
                } catch (error) {
                  console.error(`❌ Failed to delete group message ${messageId}:`, error);
                  throw error;
                }
              });

              await Promise.all(deletePromises);

              
            } catch (error) {
              console.error('❌ Error deleting group messages:', error);
              
              // หากเกิดข้อผิดพลาด ให้โหลดข้อความใหม่เพื่อซิงค์กับ server
              Alert.alert(
                'ข้อผิดพลาด', 
                'ไม่สามารถลบข้อความได้ กำลังโหลดข้อความใหม่...',
                [
                  {
                    text: 'ตกลง',
                    onPress: () => {
                      // Reload messages from server
                      loadGroupData(1, false);
                    }
                  }
                ]
              );
            }
          }
        }
      ]
    );
  };

  // ฟังก์ชันโหลดข้อความเก่า
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !canLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      console.log(`📚 Loading more group messages - page ${nextPage}`);
      
      const response = await api.get(`/groups/${groupId}/messages?limit=30&page=${nextPage}`);
      const olderMessages = response.data.messages || [];
      
      if (olderMessages.length < 30) {
        setCanLoadMore(false);
        console.log('📚 No more group messages to load');
      }
      
      if (olderMessages.length > 0) {
        // เก็บตำแหน่งปัจจุบันก่อนเพิ่มข้อความเก่า
        const currentScrollOffset = flatListRef.current?._listRef?._scrollMetrics?.offset || 0;
        
        setMessages(prevMessages => [
          ...olderMessages,
          ...prevMessages
        ]);
        setCurrentPage(nextPage);

        
        // คืนตำแหน่งการเลื่อนหลังจากเพิ่มข้อความใหม่
        setTimeout(() => {
          if (flatListRef.current && currentScrollOffset > 0) {
            flatListRef.current.scrollToOffset({ 
              offset: currentScrollOffset + (olderMessages.length * 100), 
              animated: false 
            });
          }
        }, 50);
      }
      
    } catch (error) {
      console.error('Error loading more group messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความเก่าได้');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, canLoadMore, currentPage, groupId]);

  const sendMessage = async () => {
    console.log('🚀 sendMessage called');
    console.log('📝 inputText:', inputText);
    console.log('📎 selectedFile:', selectedFile);
    console.log('🖼️ selectedImage:', selectedImage);
    
    if ((!inputText.trim() && !selectedFile && !selectedImage) || !groupId || isSending) return;

    setIsSending(true);
    const messageToSend = inputText.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}_${authUser._id}`;
    
    let messageType = 'text';
    let displayContent = messageToSend;
    
    if (selectedImage) {
      messageType = 'image';
      displayContent = displayContent || 'รูปภาพ';
    } else if (selectedFile) {
      messageType = 'file';
      displayContent = displayContent || 'ไฟล์แนบ';
    }
    
    const optimisticMessage = {
      _id: tempId,
      content: displayContent,
      sender: authUser,
      timestamp: new Date().toISOString(),
      messageType: messageType,
      fileName: selectedImage ? (selectedImage.fileName || selectedImage.filename) : (selectedFile?.name || selectedFile?.fileName),
      fileSize: selectedImage ? selectedImage.fileSize : (selectedFile?.size || selectedFile?.fileSize),
      mimeType: selectedImage ? (selectedImage.mimeType || selectedImage.type) : (selectedFile?.mimeType || selectedFile?.type),
      fileUrl: selectedImage ? selectedImage.uri : selectedFile?.uri,
      isTemporary: true
    };

    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return newMessages;
    });
    
    const fileToSend = selectedFile;
    const imageToSend = selectedImage;
    
    setInputText('');
    setSelectedFile(null);
    setSelectedImage(null);
    setShowAttachmentMenu(false);

    try {
      const contentToSend = messageToSend || (fileToSend || imageToSend ? displayContent : '');
      
      let response;
      
      if (imageToSend || fileToSend) {
        const fileAsset = imageToSend || fileToSend;
        const originalFileName = fileAsset.fileName || fileAsset.filename || fileAsset.name || 
          (imageToSend ? `image_${Date.now()}.jpg` : 'unknown_file');
        
        const fileObj = {
          uri: fileAsset.uri,
          type: fileAsset.mimeType || fileAsset.type || (imageToSend ? 'image/jpeg' : 'application/octet-stream'),
          name: originalFileName,
        };
        
        console.log('🔄 About to read file URI:', fileObj.uri);
        console.log('📁 File object details:', JSON.stringify(fileObj, null, 2));
        
        console.log('� Preparing to send file with FormData:', {
          uri: fileObj.uri,
          type: fileObj.type,
          name: fileObj.name
        });

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('content', contentToSend);
        formData.append('messageType', messageType);
        
        // Append the actual file
        formData.append('file', {
          uri: fileObj.uri,
          type: fileObj.type,
          name: fileObj.name,
        });

        console.log('📋 FormData prepared with file:', {
          content: contentToSend,
          messageType: messageType,
          fileName: fileObj.name,
          fileType: fileObj.type,
          fileUri: fileObj.uri
        });
        
        console.log('🚀 About to send POST request to:', `/groups/${groupId}/messages`);
        
        response = await api.post(`/groups/${groupId}/messages`, formData, {
          headers: {
            // ให้ axios ตั้งค่า Content-Type เองสำหรับ FormData
          },
        });
      } else {
        response = await api.post(`/groups/${groupId}/messages`, {
          content: contentToSend,
          messageType: 'text'
        });
      }


      
      // แก้ไข: ข้อมูลจริงอยู่ใน response.data.data
      const actualMessageData = response.data.data || response.data;
      
      // Debug: แสดงข้อมูลไฟล์ที่ได้รับจาก backend
      console.log('📥 File Server response:', actualMessageData);
      if (actualMessageData.fileName) {
        console.log('✅ File metadata received:', {
          fileName: actualMessageData.fileName,
          fileSize: actualMessageData.fileSize,
          fileUrl: actualMessageData.fileUrl,
          messageType: actualMessageData.messageType,
          mimeType: actualMessageData.mimeType
        });
      } else {
        console.log('❌ No fileName in response - this is the problem!');
      }
      
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        const optimisticMsg = prev.find(msg => msg._id === tempId);
        
        const messageExists = filteredMessages.some(msg => {
          if (msg._id === actualMessageData._id) return true;
          
          if ((fileToSend || imageToSend) && msg.fileName && msg.sender?._id === authUser?._id) {
            const timeDiff = Math.abs(new Date(msg.timestamp) - new Date(actualMessageData.timestamp));
            if (msg.fileName === (actualMessageData.fileName || optimisticMsg?.fileName) && timeDiff < 5000) {
              return true;
            }
          }
          
          return false;
        });
        
        if (messageExists) {
          return filteredMessages;
        }
        
        // ตรวจสอบว่า actualMessageData มี _id ที่ถูกต้องหรือไม่
        if (!actualMessageData._id) {
          console.log('❌ Invalid message data - no _id found, keeping temp message');
          return prev; // คืนค่า messages เดิมรวมทั้ง temp message
        }
        
        const serverMessage = { 
          ...actualMessageData, 
          isTemporary: false,
          messageType: (actualMessageData.fileUrl || optimisticMsg?.fileName) ? messageType : actualMessageData.messageType,
          fileName: actualMessageData.fileName || optimisticMsg?.fileName,
          fileSize: actualMessageData.fileSize || optimisticMsg?.fileSize,
          mimeType: actualMessageData.mimeType || optimisticMsg?.mimeType,
        };
        
        const updatedMessages = [...filteredMessages, serverMessage];
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return updatedMessages;
      });
      console.log('🎉 Message sent successfully, ID:', actualMessageData._id);
    } catch (error) {
      console.error('❌ Error sending group message:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error status:', error.response?.status);
      
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setInputText(messageToSend);
      setSelectedFile(fileToSend);
      setSelectedImage(imageToSend);

      let errorMessage = 'ไม่สามารถส่งข้อความได้';
      
      if (error.response?.status === 500) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ภายหลัง';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      }
      
      console.error('❌ About to show alert with message:', errorMessage);
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const pickFile = async (isImage = false) => {
    try {
      setShowAttachmentMenu(false);
      
      if (isImage) {
        console.log('📷 Opening image picker...');
        
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
          return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'Images',
          allowsEditing: false,
          aspect: undefined,
          quality: 0.8, // ลดคุณภาพเล็กน้อยเพื่อลดขนาดไฟล์
          base64: false, // ไม่ต้องการ base64 ตรงนี้
        });
        
        console.log('📷 Image picker result:', result);
        
        if (!result.canceled && result.assets && result.assets[0]) {
          console.log('📸 Image selected:', result.assets[0]);
          // เซ็ตรูปภาพที่เลือก
          setSelectedImage(result.assets[0]);
        }
      } else {
        console.log('📁 Opening document picker...');
        
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        
        console.log('📁 Document picker result:', result);
        
        if (!result.cancelled && result.assets?.[0]) {
          setSelectedFile(result.assets[0]);
        } else if (result.type === 'success') {
          setSelectedFile(result);
        }
      }
    } catch (error) {
      console.error('❌ Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถเลือกไฟล์ได้: ${error.message}`);
    }
  };

  // ฟังก์ชันส่งรูปภาพทันที
  const sendImageDirectly = async (imageAsset) => {
    if (!groupId || isSending || !authUser) return;
    
    setIsSending(true);
    const tempId = `temp_image_${Date.now()}_${Math.random()}_${authUser._id}`;
    
    try {
      console.log('📸 Starting image upload:', imageAsset.uri);

      // สร้าง optimistic message
      const optimisticMessage = {
        _id: tempId,
        content: 'รูปภาพ',
        senderId: authUser._id,
        sender: {
          _id: authUser._id,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          username: authUser.username,
          avatar: authUser.avatar
        },
        timestamp: new Date().toISOString(),
        messageType: 'image',
        fileUrl: imageAsset.uri, // ใช้ local URI ก่อน
        fileName: imageAsset.fileName || imageAsset.filename || `image_${Date.now()}.jpg`,
        fileSize: imageAsset.fileSize || 0,
        mimeType: imageAsset.mimeType || imageAsset.type || 'image/jpeg',
        groupId: groupId,
        isTemporary: true,
        readBy: []
      };

      // เพิ่ม optimistic message และ scroll
      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return newMessages;
      });
      
      // เตรียมข้อมูลไฟล์
      const fileName = imageAsset.fileName || imageAsset.filename || `image_${Date.now()}.jpg`;
      
      const fileObject = {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || imageAsset.type || 'image/jpeg', 
        name: fileName,
      };
      
      console.log('📁 File object:', fileObject);
      
      // แปลงเป็น base64
      console.log('🔄 About to read image URI:', fileObject.uri);
      console.log('📁 Image object details:', JSON.stringify(fileObject, null, 2));
      
      // Check if file exists first
      try {
        const fileInfo = await FileSystem.getInfoAsync(fileObject.uri);
        console.log('📋 Image file info:', fileInfo);
        
        if (!fileInfo.exists) {
          throw new Error(`Image file does not exist at URI: ${fileObject.uri}`);
        }
        
        if (fileInfo.size === 0) {
          throw new Error(`Image file is empty (0 bytes): ${fileObject.uri}`);
        }
      } catch (infoError) {
        console.error('❌ Error getting image file info:', infoError);
        throw new Error(`Cannot access image file: ${infoError.message}`);
      }
      
      let base64;
      try {
        base64 = await FileSystem.readAsStringAsync(fileObject.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('🔤 Base64 conversion completed, length:', base64.length);
        console.log('🔤 Base64 preview (first 100 chars):', base64.substring(0, 100));
        
        if (!base64 || base64.length === 0) {
          throw new Error('Base64 encoding returned empty string');
        }
      } catch (fileError) {
        console.error('❌ Error reading image as base64:', fileError);
        throw new Error(`Failed to read image: ${fileError.message}`);
      }

      // ส่งไปยัง server
      const response = await api.post(`/groups/${groupId}/messages`, {
        content: 'รูปภาพ',
        messageType: 'image',
        fileData: {
          base64: base64,
          name: fileObject.name,
          type: fileObject.type,
        }
      });

      // อัปเดตข้อความด้วยข้อมูลจาก server
      setMessages(prev => {
        console.log('📋 Raw server response:', response.data);
        console.log('📋 Response type:', typeof response.data);
        
        // ตรวจสอบว่า response เป็น object หรือ string
        if (typeof response.data === 'string') {
          console.log('⚠️ Server returned string instead of message object, keeping optimistic message');
          // ถ้า server ส่งแค่ string กลับมา ให้เก็บ optimistic message ไว้ก่อน
          // และจะถูกแทนที่เมื่อ socket ส่งข้อความจริงมา
          return prev.map(msg => 
            msg._id === tempId 
              ? { ...msg, isTemporary: false, sent: true }
              : msg
          );
        }
        
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        
        // ใช้ข้อมูลจาก response.data หรือ response.data.message
        const serverMessage = response.data.message || response.data;
        console.log('📋 Server message data:', serverMessage);
        
        if (!serverMessage || !serverMessage._id) {
          console.log('⚠️ Invalid server message data, keeping optimistic message');
          return prev.map(msg => 
            msg._id === tempId 
              ? { ...msg, isTemporary: false, sent: true }
              : msg
          );
        }
        
        // เพิ่มข้อความใหม่จาก server
        const updatedMessages = [...filteredMessages, {
          ...serverMessage,
          isTemporary: false
        }];
        
        console.log('📋 Updated messages count:', updatedMessages.length);
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        return updatedMessages;
      });

      console.log('✅ Image sent successfully');
      
    } catch (error) {
      console.error('❌ Error sending image:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // ลบ optimistic message เมื่อเกิด error
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      
      let errorMessage = 'ไม่สามารถส่งรูปภาพได้';
      if (error.response?.status === 413) {
        errorMessage = 'รูปภาพใหญ่เกินไป กรุณาเลือกรูปภาพที่เล็กกว่า';
      } else if (error.response?.status === 400) {
        errorMessage = 'ข้อมูลรูปภาพไม่ถูกต้อง';
      } else if (error.message.includes('Network')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // ฟังก์ชันเปิดรูปภาพในโหมดเต็มจอ
  const openImageModal = (imageUri) => {
    setSelectedModalImage(imageUri);
    setImageModalVisible(true);
  };

  // ฟังก์ชันแสดงการแจ้งเตือนสำเร็จที่หายไปเอง
  const showSuccessNotification = (message) => {
    setSuccessNotification({ visible: true, message });
    setTimeout(() => {
      setSuccessNotification({ visible: false, message: '' });
    }, 3000); // หายไปใน 3 วินาที
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      console.log('📥 Starting download process...');
      console.log('📥 File URL:', fileUrl);
      console.log('📁 File name:', fileName);
      
      // ตรวจสอบว่า FileSystem work หรือไม่
      console.log('📂 Document directory:', FileSystem.documentDirectory);
      
      // ตรวจสอบว่า FileSystem.documentDirectory มีค่าหรือไม่
      if (!FileSystem.documentDirectory) {
        console.error('❌ FileSystem.documentDirectory is not available');
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเข้าถึงระบบไฟล์ได้');
        return;
      }
      
      // ไม่ต้องใช้ token สำหรับ Cloudinary files
      const token = await AsyncStorage.getItem('token');

      let fullUrl = fileUrl;
      
      // ตรวจสอบว่าเป็น Cloudinary URL หรือไม่
      if (fileUrl.includes('cloudinary.com')) {
        // ใช้ URL โดยตรงสำหรับ Cloudinary (ไม่ต้องใช้ token)
        fullUrl = fileUrl;
        console.log('🌤️ Using Cloudinary URL directly:', fullUrl);
      } else if (!fileUrl.startsWith('http')) {
        // สำหรับไฟล์ที่เก็บบน server เอง
        fullUrl = `${API_URL}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
        console.log('🏠 Using local server URL:', fullUrl);
      }

      const finalFileName = fileName || `file_${new Date().getTime()}`;
      const fileExtension = finalFileName.split('.').pop()?.toLowerCase() || '';
      
      console.log('🔍 File extension detected:', fileExtension);
      
      // ตรวจสอบประเภทไฟล์
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp'].includes(fileExtension);
      const isMedia = isImage || isVideo;

      console.log('📷 Is media file:', isMedia, '(Image:', isImage, ', Video:', isVideo, ')');

      // สำหรับ Cloudinary ไม่ต้องใช้ Authorization header
      const headers = fileUrl.includes('cloudinary.com') ? {} : { Authorization: `Bearer ${token}` };
      console.log('📋 Headers:', headers);
      
      if (isMedia) {
        // สำหรับรูปภาพและวิดีโอ - บันทึกไปที่ Gallery/Photos
        try {
          // ขอ permission
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('ข้อผิดพลาด', 'ต้องการสิทธิ์ในการเข้าถึงไฟล์เพื่อบันทึกรูปภาพ/วิดีโอ');
            return;
          }
          
          // สำหรับ Cloudinary URL ลองใช้วิธีอื่น
          if (fileUrl.includes('cloudinary.com')) {
            console.log('🌤️ Attempting direct Cloudinary download...');
            
            // ลองใช้ MediaLibrary.createAssetAsync โดยตรงจาก URL
            try {
              // ลอง download ผ่าน FileSystem ก่อนแล้วค่อยบันทึก
              const fileUri = FileSystem.documentDirectory + finalFileName;
              console.log('💾 Downloading to:', fileUri);
              
              const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);
              console.log('📁 Download result:', downloadResult.status);
              
              if (downloadResult.status === 200) {
                const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
                
                // แสดงการแจ้งเตือนที่หายไปเอง
                showSuccessNotification(
                  isImage ? 
                    `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}` : 
                    `วิดีโอถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}`
                );
                
                console.log('✅ Media saved to gallery:', asset);
              } else {
                throw new Error(`Download failed with status: ${downloadResult.status}`);
              }
              return; // สำเร็จแล้ว ออกจาก function
              
            } catch (directError) {
              console.log('⚠️ Direct download failed, trying temp file method:', directError.message);
              // ถ้าไม่ได้ ให้ fallback ไปใช้วิธี temp file
            }
          }
          
          // ดาวน์โหลดไฟล์ชั่วคราว (fallback method)
          const timestamp = new Date().getTime();
          const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${finalFileName}`;
          
          console.log('📍 Temp file path:', tempUri);
          console.log('🔄 Starting download with headers:', headers);
          
          const downloadResult = await FileSystem.downloadAsync(fullUrl, tempUri, {
            headers: headers
          });

          console.log('📊 Download result:', downloadResult);

          if (downloadResult.status === 200) {
            console.log('✅ Download successful, saving to gallery...');
            // บันทึกไปที่ MediaLibrary (Gallery/Photos)
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            
            // ลบไฟล์ชั่วคราว
            await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
            
            // แสดงการแจ้งเตือนที่หายไปเอง
            showSuccessNotification(
              isImage ? 
                `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}` : 
                `วิดีโอถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}`
            );
            
            console.log('✅ Media saved to gallery:', asset);
          } else {
            console.error('❌ Download failed with status:', downloadResult.status);
            throw new Error(`HTTP ${downloadResult.status}`);
          }
          
        } catch (mediaError) {
          console.error('❌ Error saving to gallery:', mediaError);
          console.error('Error details:', {
            url: fullUrl,
            fileName: finalFileName,
            headers: headers,
            error: mediaError.message
          });
          Alert.alert('ข้อผิดพลาด', `ไม่สามารถบันทึกไฟล์ไปที่แกลเลอรี่ได้: ${mediaError.message}`);
        }
      } else {
        // สำหรับไฟล์อื่นๆ - บันทึกไปที่ Downloads folder
        try {
          if (Platform.OS === 'ios') {
            // iOS: ใช้ Sharing API เหมือนเดิม
            const timestamp = new Date().getTime();
            const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${finalFileName}`;
            
            const downloadResult = await FileSystem.downloadAsync(fullUrl, tempUri, {
              headers: headers
            });

            if (downloadResult.status === 200) {
              // ใช้ Sharing API เพื่อให้ผู้ใช้เลือกที่เก็บ
              const isAvailable = await Sharing.isAvailableAsync();
              
              if (isAvailable) {
                await Sharing.shareAsync(downloadResult.uri, {
                  dialogTitle: `บันทึกไฟล์: ${finalFileName}`
                });
              } else {
                showSuccessNotification(`ไฟล์ถูกบันทึกที่: ${downloadResult.uri}`);
              }
            } else {
              throw new Error(`HTTP ${downloadResult.status}`);
            }
          } else {
            // Android: บันทึกตรงไปที่ Downloads folder
            const downloadDir = `${FileSystem.documentDirectory}Downloads/`;
            await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
            
            const timestamp = new Date().getTime();
            // ทำความสะอาดชื่อไฟล์
            const cleanFileName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const localUri = `${downloadDir}${cleanFileName}_${timestamp}`;

            console.log('💾 Downloading to:', localUri);
            
            const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri, {
              headers: headers
            });

            console.log('📊 Download result:', downloadResult);

            if (downloadResult.status === 200) {
              console.log('✅ Download successful');
              showSuccessNotification(
                `ไฟล์ถูกบันทึกไปที่ Downloads folder แล้ว\nชื่อไฟล์: ${cleanFileName}_${timestamp}\n\nคุณสามารถหาไฟล์ได้ใน File Manager > Downloads`
              );
            } else {
              throw new Error(`HTTP ${downloadResult.status}`);
            }
          }
          
        } catch (fileError) {
          console.error('❌ Error saving file:', fileError);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
        }
      }
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      console.error('Error details:', {
        message: error.message,
        url: fileUrl,
        fileName: fileName
      });
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถดาวน์โหลดได้: ${error.message}`);
    }
  };

  const deleteMessage = async (messageId) => {
    Alert.alert('ลบข้อความ', 'คุณต้องการลบข้อความนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/groups/${groupId}/messages/${messageId}`);
            setMessages(prev => prev.filter(msg => msg._id !== messageId));
          } catch (error) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
          }
        }
      }
    ]);
  };

  const editMessage = (message) => {
    setEditingMessage(message);
    setEditText(message.content);
    setShowEditModal(true);
  };

  const saveEditMessage = async () => {
    if (!editText.trim() || !editingMessage) return;

    try {
      const response = await api.put(`/groups/${groupId}/messages/${editingMessage._id}`, {
        content: editText.trim()
      });

      // อัปเดต message ใน state
      setMessages(prev => prev.map(msg => 
        msg._id === editingMessage._id 
          ? { ...msg, content: editText.trim(), editedAt: new Date().toISOString() }
          : msg
      ));

      setShowEditModal(false);
      setEditingMessage(null);
      setEditText('');
      
      console.log('✅ Message edited successfully');
    } catch (error) {
      console.error('❌ Error editing message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแก้ไขข้อความได้');
    }
  };

  const cancelEditMessage = () => {
    setShowEditModal(false);
    setEditingMessage(null);
    setEditText('');
  };

  const handleMessageDoublePress = (message) => {
    const isMyMessage = message.sender?._id === authUser._id;
    if (isMyMessage && message.messageType === 'text') {
      editMessage(message);
    }
  };

  const leaveGroup = async () => {
    const isAdmin = isGroupAdmin();
    
    if (isAdmin) {
      // หัวหน้ากลุ่มต้องลบกลุ่ม
      Alert.alert(
        'ลบกลุ่ม', 
        'คุณเป็นหัวหน้ากลุ่ม การออกจากกลุ่มจะทำให้กลุ่มนี้ถูกลบถาวร\nคุณต้องการลบกลุ่มนี้หรือไม่?', 
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ลบกลุ่ม', 
            style: 'destructive',
            onPress: async () => {
              try {
                const { deleteGroup } = await import('../../service/api');
                await deleteGroup(groupId);
                setShowSuccess(true);
                setTimeout(() => navigation.goBack(), 1500);
              } catch (error) {
                console.error('Delete group error:', error.response?.data || error.message);
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบกลุ่มได้');
              }
            }
          }
        ]
      );
    } else {
      // สมาชิกทั่วไปออกจากกลุ่ม
      Alert.alert('ออกจากกลุ่ม', 'คุณต้องการออกจากกลุ่มนี้หรือไม่?', [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ออกจากกลุ่ม', style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/groups/${groupId}/leave`);
              setShowSuccess(true);
              setTimeout(() => navigation.goBack(), 1500);
            } catch (error) {
              console.error('Leave group error:', error.response?.data || error.message);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากกลุ่มได้');
            }
          }
        }
      ]);
    }
  };

  // ฟังก์ชันการจัดการกลุ่ม
  const isGroupAdmin = () => {
    const adminId = groupInfo?.admin || groupInfo?.creator;
    const currentUserId = authUser?._id;
    
    if (!adminId || !currentUserId) return false;
    
    // ตรวจสอบ ID โดยแปลงเป็น string เพื่อเปรียบเทียบ
    const adminIdString = typeof adminId === 'object' ? adminId._id || adminId.toString() : adminId.toString();
    const currentUserIdString = typeof currentUserId === 'object' ? currentUserId.toString() : currentUserId.toString();
    

    
    return adminIdString === currentUserIdString;
  };

  const openEditGroupScreen = () => {
    navigation.navigate('EditGroup', { groupId });
  };

  const getAdminName = useMemo(() => {
    const adminId = groupInfo?.admin || groupInfo?.creator;
    
    if (!adminId) {
      return 'ไม่ทราบ';
    }
    
    // ตรวจสอบว่า adminId เป็น Object หรือ String
    const adminIdString = typeof adminId === 'object' ? adminId._id || adminId.toString() : adminId.toString();
    
    const adminMember = groupMembers.find(member => {
      const memberIdString = typeof member._id === 'object' ? member._id.toString() : member._id.toString();
      return memberIdString === adminIdString;
    });
    
    if (adminMember) {
      const name = adminMember.name || 
                  `${adminMember.firstName || ''} ${adminMember.lastName || ''}`.trim() || 
                  adminMember.email || 'ไม่ทราบ';
      return name;
    }
    
    // ตรวจสอบว่าเป็นตัวเราเอง
    const currentUserIdString = authUser?._id?.toString();
    if (adminIdString === currentUserIdString) {
      return 'คุณ';
    }
    
    // ถ้าไม่พบในรายชื่อสมาชิก แต่มีข้อมูล admin object
    if (typeof adminId === 'object' && (adminId.firstName || adminId.name)) {
      const name = adminId.name || `${adminId.firstName || ''} ${adminId.lastName || ''}`.trim();
      return name;
    }
    
    return 'ผู้ใช้ที่ออกจากกลุ่มแล้ว';
  }, [groupInfo?.admin, groupInfo?.creator, groupMembers, authUser?._id]);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'วันนี้';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'เมื่อวาน';
    } else {
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid DateTime';
    
    return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ฟังก์ชันแก้ไขชื่อไฟล์ที่เป็น URL encoding
  const decodeFileName = (fileName) => {
    if (!fileName) return 'ไฟล์แนบ';
    
    try {
      // ลองแก้ไข URL encoding
      const decoded = decodeURIComponent(fileName);
      return decoded;
    } catch (error) {
      // ถ้าแก้ไขไม่ได้ ใช้ชื่อเดิม
      return fileName;
    }
  };

  // ฟังก์ชันเลือกข้อความตามประเภทไฟล์
  const getFileIcon = (fileName) => {
    if (!fileName) {
      return <Text style={{ fontSize: 12, color: "#666", fontWeight: 'bold' }}>FILE</Text>;
    }
    
    const decodedName = decodeFileName(fileName);
    const extension = decodedName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <Text style={{ fontSize: 12, color: "#E53E3E", fontWeight: 'bold' }}>PDF</Text>;
      case 'doc':
      case 'docx':
        return <Text style={{ fontSize: 12, color: "#2B6CB0", fontWeight: 'bold' }}>DOC</Text>;
      case 'xls':
      case 'xlsx':
        return <Text style={{ fontSize: 12, color: "#38A169", fontWeight: 'bold' }}>XLS</Text>;
      case 'ppt':
      case 'pptx':
        return <Text style={{ fontSize: 12, color: "#D69E2E", fontWeight: 'bold' }}>PPT</Text>;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'bmp':
        return <Text style={{ fontSize: 12, color: "#9F7AEA", fontWeight: 'bold' }}>IMG</Text>;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <Text style={{ fontSize: 12, color: "#E53E3E", fontWeight: 'bold' }}>VID</Text>;
      case 'mp3':
      case 'wav':
      case 'aac':
      case 'flac':
        return <Text style={{ fontSize: 12, color: "#38B2AC", fontWeight: 'bold' }}>AUD</Text>;
      case 'zip':
      case 'rar':
      case '7z':
        return <Text style={{ fontSize: 12, color: "#805AD5", fontWeight: 'bold' }}>ZIP</Text>;
      case 'txt':
        return <Text style={{ fontSize: 12, color: "#4A5568", fontWeight: 'bold' }}>TXT</Text>;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <Text style={{ fontSize: 12, color: "#F6AD55", fontWeight: 'bold' }}>JS</Text>;
      case 'css':
      case 'scss':
      case 'less':
        return <Text style={{ fontSize: 12, color: "#4299E1", fontWeight: 'bold' }}>CSS</Text>;
      case 'html':
        return <Text style={{ fontSize: 12, color: "#E53E3E", fontWeight: 'bold' }}>HTML</Text>;
      default:
        return <Text style={{ fontSize: 12, color: "#666", fontWeight: 'bold' }}>FILE</Text>;
    }
  };

  // ฟังก์ชันสำหรับแสดง/ซ่อนเวลาของข้อความ
  const toggleShowTime = (messageId) => {
    setShowTimeForMessages(prev => {
      const newSet = new Set(prev);
      const isCurrentlyShown = newSet.has(messageId);
      
      // สร้าง animated value ถ้ายังไม่มี
      if (!timeAnimations[messageId]) {
        setTimeAnimations(prevAnims => ({
          ...prevAnims,
          [messageId]: new Animated.Value(isCurrentlyShown ? 1 : 0)
        }));
      }
      
      // Animation สำหรับแสดง/ซ่อน
      const animValue = timeAnimations[messageId] || new Animated.Value(isCurrentlyShown ? 1 : 0);
      
      if (isCurrentlyShown) {
        // ซ่อนด้วย animation
        Animated.timing(animValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          newSet.delete(messageId);
          setShowTimeForMessages(new Set(newSet));
        });
      } else {
        // แสดงด้วย animation
        newSet.add(messageId);
        setShowTimeForMessages(new Set(newSet));
        
        Animated.timing(animValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
      
      // อัปเดต animated value
      setTimeAnimations(prevAnims => ({
        ...prevAnims,
        [messageId]: animValue
      }));
      
      return newSet;
    });
  };

  // ฟังก์ชันตรวจสอบว่าควรแสดงเวลาหรือไม่
  const shouldShowTime = (item, index) => {
    // แสดงเวลาสำหรับข้อความล่าสุดเสมอ
    if (index === messages.length - 1) {
      return true;
    }
    // แสดงเวลาสำหรับข้อความที่ถูกคลิก
    return showTimeForMessages.has(item._id);
  };

  // ฟังก์ชันสำหรับคำนวณจำนวนคนที่อ่านข้อความ
  const getReadCount = (messageId) => {
    return messageReadCount[messageId] || 0;
  };

  // ฟังก์ชันสำหรับแสดงสถานะการอ่านในกลุ่ม
  const getGroupReadStatus = (item) => {
    const readCount = getReadCount(item._id);
    const totalMembers = groupMembers.length;
    
    if (readCount === 0) {
      return { text: 'ส่งแล้ว', isRead: false };
    } else if (readCount === totalMembers - 1) { // ลบตัวเองออก
      return { text: 'อ่านแล้วทุกคน', isRead: true };
    } else {
      return { text: `อ่านแล้ว ${readCount} คน`, isRead: true };
    }
  };

  const renderMessage = ({ item, index }) => {
    // ข้อความระบบ (เช่น การเข้าร่วมกลุ่ม)
    if (item.messageType === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
          <Text style={styles.systemMessageTime}>
            {formatDateTime(item.timestamp || item.time)}
          </Text>
        </View>
      );
    }

    // แสดงวันที่หากข้อความก่อนหน้าเป็นวันอื่น
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMessage || 
      (item.timestamp && prevMessage.timestamp && 
       new Date(item.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString());

    const handleMessagePress = () => {
      console.log('👆 GROUP handleMessagePress called:', { 
        selectionMode, 
        messageId: item._id,
        selectedMessages: selectedMessages.length 
      });
      
      if (selectionMode) {
        // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
        const isMyMessage = item.sender?._id === authUser._id;
        
        if (!isMyMessage) {
          return; // กดไม่ได้เลย
        }
        
        setSelectedMessages(prev => {
          const isSelected = prev.includes(item._id);
          const newSelection = isSelected 
            ? prev.filter(id => id !== item._id)
            : [...prev, item._id];
          console.log('✅ Direct update selectedMessages:', { 
            was: prev, 
            now: newSelection,
            action: isSelected ? 'removed' : 'added' 
          });
          return newSelection;
        });
        return;
      }
      
      // In normal mode - handle double press and time toggle
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      
      if (item.lastPress && (now - item.lastPress) < DOUBLE_PRESS_DELAY) {
        handleMessageDoublePress(item);
      } else {
        toggleShowTime(item._id);
        item.lastPress = now;
      }
    };

    const handleLongPress = () => {
      const isMyMessage = item.sender?._id === authUser._id;
      if (isMyMessage) {
        // เข้าโหมดเลือกข้อความแทนการลบทันที
        setSelectionMode(true);
        setSelectedMessages([item._id]);
      }
      // ถ้าไม่ใช่ข้อความของตัวเอง ไม่ทำอะไร
    };
    
    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        )}
        
        <GroupMessageBubble
          item={{
            ...item,
            readCount: messageReadCount[item._id]?.readCount || item.readCount || 0,
            totalMembers: messageReadCount[item._id]?.totalMembers || 0,
            readStatus: messageReadCount[item._id]?.readStatus || item.readStatus || null
          }}
          index={index}
          currentUser={authUser}
          selectionMode={selectionMode}
          selectedMessages={selectedMessages}
          showTimeForMessages={showTimeForMessages}
          onMessagePress={handleMessagePress}
          onLongPress={handleLongPress}
          onImagePress={openImageModal}
          onFilePress={(fileUrl, fileName) => downloadFile(fileUrl, fileName || 'downloaded_file')}
          formatDateTime={formatDateTime}
          getFileIcon={getFileIcon}
          decodeFileName={decodeFileName}
          formatFileSize={formatFileSize}
          toggleShowTime={toggleShowTime}
          shouldShowTime={shouldShowTime}
          getGroupReadStatus={getGroupReadStatus}
        />
      </View>
    );
  };

  const renderMemberItem = ({ item }) => {
    console.log('🎭 Rendering member:', item);
    const memberName = item.name || 
                      `${item.firstName || ''} ${item.lastName || ''}`.trim() || 
                      item.email || 'Unknown';
    
    // ตรวจสอบว่าเป็นผู้สร้างกลุ่มหรือไม่
    const adminId = groupInfo?.admin || groupInfo?.creator;
    const memberIdString = typeof item._id === 'object' ? item._id.toString() : item._id.toString();
    const adminIdString = typeof adminId === 'object' ? adminId._id || adminId.toString() : adminId?.toString();
    const isCreator = memberIdString === adminIdString;
    
    console.log('🔍 Member check:', { memberIdString, adminIdString, isCreator });
    
    return (
      <View style={styles.memberItem}>
        <Image
          source={{
            uri: item.avatar?.startsWith('http') 
              ? item.avatar 
              : item.avatar 
                ? `${API_URL}${item.avatar}`
                : 'https://via.placeholder.com/40'
          }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {memberName}
            {isCreator && ' 👑'}
          </Text>
          <Text style={styles.memberEmail}>
            {item.email}
            {isCreator && ' • ผู้สร้างกลุ่ม'}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isCreator && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ผู้สร้าง</Text>
            </View>
          )}
          
          {/* ปุ่มเตะสมาชิกออก - แสดงเฉพาะผู้สร้างกลุ่ม และไม่ใช่ตัวเอง */}
          {(groupInfo?.creator === authUser._id || groupInfo?.admin === authUser._id) && 
           !isCreator && 
           item._id !== authUser._id && (
            <TouchableOpacity
              style={styles.removeMemberButton}
              onPress={() => {
                Alert.alert(
                  'เตะสมาชิกออก',
                  `คุณต้องการเตะ ${memberName} ออกจากกลุ่มหรือไม่?`,
                  [
                    { text: 'ยกเลิก', style: 'cancel' },
                    { 
                      text: 'เตะออก', 
                      style: 'destructive',
                      onPress: () => removeMember(item._id)
                    }
                  ]
                );
              }}
            >
              <Text style={styles.removeMemberText}>เตะออก</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ฟังก์ชันแสดง loading content ในกรอบข้อความ
  const renderMessageLoadingContent = () => {
    return (
      <View style={styles.messageLoadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>กำลังโหลด...</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{
        flex: 1,
        backgroundColor: '#ffffff'
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
      }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Chat', { 
            chatId: route.params?.returnChatId || route.params?.groupId 
          })} 
          style={{
            padding: 8,
            marginRight: 8
          }}
        >
          <Text style={{
            fontSize: 18,
            color: '#3b82f6',
            fontWeight: 'bold'
          }}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => {
            console.log('� Opening members modal...');
            setShowMembersModal(true);
          }}
        >
          <Image
            source={{
              uri: (groupInfo?.groupAvatar || groupAvatar)?.startsWith('http') 
                ? (groupInfo?.groupAvatar || groupAvatar)
                : (groupInfo?.groupAvatar || groupAvatar)
                  ? `${API_URL}${groupInfo?.groupAvatar || groupAvatar}`
                  : 'https://via.placeholder.com/40'
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#000000'
            }}>{groupInfo?.name || groupName}</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Text style={{
                fontSize: 12,
                color: '#10b981'
              }}>{groupMembers.length} สมาชิก</Text>
           
            </View>
          </View>
        </TouchableOpacity>

        {/* Header Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* ปุ่มยกเลิก/ลบ สำหรับ Selection Mode */}
          {selectionMode ? (
            <>
              {/* ปุ่มยกเลิก - ซ้าย */}
              <TouchableOpacity
                onPress={() => {
                  console.log('🔄 Cancel selection mode');
                  setSelectionMode(false);
                  setSelectedMessages([]);
                }}
                style={{ 
                  padding: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#6B7280',
                  borderRadius: 8,
                  minWidth: 60,
                  minHeight: 32,
                  marginRight: 8
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  ยกเลิก
                </Text>
              </TouchableOpacity>
              
              {/* ปุ่มลบ - ขวา */}
              <TouchableOpacity
                onPress={deleteSelectedMessages}
                disabled={selectedMessages.length === 0}
                style={{ 
                  padding: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedMessages.length > 0 ? '#FF3B30' : '#9CA3AF',
                  borderRadius: 8,
                  minWidth: 50,
                  minHeight: 32
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  ลบ ({selectedMessages.length})
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* GroupChatMenuButton - แทนที่ปุ่มเมนูเดิม */}
              <GroupChatMenuButton
                isGroupAdmin={isGroupAdmin()}
                onManageMessages={() => {
                  console.log('🔄 Activating selection mode');
                  console.log('📱 Current selectionMode:', selectionMode);
                  setSelectionMode(true);
                  console.log('📱 After setSelectionMode(true)');
                }}
                onManageGroup={openEditGroupScreen}
                onLeaveGroup={leaveGroup}
              />
            </>
          )}
        </View>
      </View>

      {/* Messages */}
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: '#ffffff'
        }}
        activeOpacity={1}
        onPress={() => setShowAttachmentMenu(false)}
      >
        {/* แสดงรายการข้อความโดยตรง */}
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id?.toString() || `message_${index}_${item.timestamp}`}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContainer,
              messages.length === 0 && styles.emptyMessagesContainer
            ]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                title="ดึงข้อความใหม่..."
                tintColor={COLORS.primary}
              />
            }
            maxToRenderPerBatch={15}
            windowSize={15}
            initialNumToRender={15}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          bounces={true}
          getItemLayout={null}
          maintainVisibleContentPosition={null}
          ListEmptyComponent={() => (
            <View style={styles.emptyMessageContainer}>
              <Text style={styles.emptyMessageText}>
                ยังไม่มีข้อความในกลุ่มนี้
              </Text>
              <Text style={styles.emptyMessageSubText}>
                เริ่มต้นการสนทนากลุ่มได้เลย!
              </Text>
            </View>
          )}
          onContentSizeChange={(contentWidth, contentHeight) => {
            // Auto-scroll ไปข้อความล่าสุดเฉพาะเมื่อมีข้อความใหม่ (ไม่ใช่เมื่อแสดง/ซ่อน timestamp)
            if (messages.length > 0 && !hasScrolledToEnd && !isLoadingMore) {
              console.log('📏 Group Chat - Content size changed, scrolling to end due to new messages. Messages:', messages.length);
              // หลายครั้งเพื่อให้แน่ใจ
              [10, 50, 100, 200].forEach((delay) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, delay);
              });
              
              setTimeout(() => {
                setHasScrolledToEnd(true);
              }, 250);
            }
          }}
          onLayout={() => {
            // เมื่อ FlatList layout เสร็จ - scroll เฉพาะเมื่อยังไม่เคย scroll (ระหว่างโหลด)
            if (messages.length > 0 && !hasScrolledToEnd && !isLoadingMore) {
              console.log('📐 Group Chat - FlatList layout complete, scrolling to end due to initial load');
              // หลายครั้งเพื่อให้แน่ใจ
              [20, 100, 200, 400].forEach((delay) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, delay);
              });
              
              setTimeout(() => {
                setHasScrolledToEnd(true);
              }, 450);
            }
          }}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            const isNearTop = contentOffset.y < 500; // เพิ่มจาก 200 เป็น 500
            
            setShowScrollToBottom(!isAtBottom);
            
            // แสดงปุ่มโหลดข้อความเก่าเมื่อเลื่อนขึ้นไป
            const actualMessageCount = messages.filter(msg => msg.type !== 'date_separator').length;
            // ลดเงื่อนไขให้ง่ายขึ้น - แสดงเมื่อเลื่อนขึ้นมาและมีข้อความมากกว่า 5 ข้อความ
            const shouldShowLoadButton = isNearTop && canLoadMore && actualMessageCount >= 5;
            
            // Only log when button state would change
            if (shouldShowLoadButton !== showLoadOlderButton) {
              console.log('📏 Load button state change:', { shouldShowLoadButton, isNearTop, canLoadMore, actualMessageCount });
            }
            
            setShowLoadOlderButton(shouldShowLoadButton);
          }}
          scrollEventThrottle={16}
          ListHeaderComponent={() => {
            // console.log('📏 ListHeader Debug:', { showLoadOlderButton, isLoadingMore, canLoadMore, messagesCount: messages.length });
            
            // ทดสอบ: แสดงปุ่มเสมอ
            return (
              <LoadOlderMessagesGroupChat
                visible={true}
                isLoading={isLoadingMore}
                canLoadMore={canLoadMore}
                onLoadMore={loadMoreMessages}
                messagesCount={messages.filter(msg => msg.type !== 'date_separator').length}
                style={styles.loadOlderInList}
              />
            );
          }}
        />
      </TouchableOpacity>

      {/* Debug Banner - Group Chat */}
      <View style={{
        backgroundColor: selectionMode ? '#FF3B30' : '#6B7280',
        paddingVertical: 4,
        paddingHorizontal: 16,
        alignItems: 'center'
      }}>
        <Text style={{
          color: 'white',
          fontSize: 10,
          fontWeight: 'bold'
        }}>
          GROUP CHAT - Selection: {selectionMode ? 'ON' : 'OFF'} | Selected: {selectedMessages.length}
        </Text>
      </View>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={() => {
            try {
              flatListRef.current?.scrollToEnd({ animated: true });
            } catch (error) {
              console.log('Scroll to bottom failed:', error);
            }
            setShowScrollToBottom(false);
          }}
        >
          <Text style={styles.scrollToBottomIcon}>↓</Text>
        </TouchableOpacity>
      )}

      {/* ChatInputBar - แทนที่ Input Area เดิม */}
      <ChatInputBar
        newMessage={inputText}
        setNewMessage={setInputText}
        selectedFile={selectedFile}
        isSending={isSending}
        showAttachmentMenu={showAttachmentMenu}
        setShowAttachmentMenu={setShowAttachmentMenu}
        onSendMessage={sendMessage}
        onPickImage={() => pickFile(true)}
        onPickFile={() => pickFile(false)}
        onRemoveFile={() => setSelectedFile(null)}
        getFileIcon={getFileIcon}
      />


      {/* Members Modal */}
      <Modal visible={showMembersModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.membersModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>สมาชิกในกลุ่ม ({groupMembers.length})</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowMembersModal(false)}
              >
                <Text style={styles.closeModalButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* แสดงข้อมูลผู้สร้างกลุ่ม */}
            {(groupInfo?.admin || groupInfo?.creator) && (
              <View style={styles.groupCreatorInfo}>
                <Text style={styles.groupCreatorLabel}>👑 ผู้สร้างกลุ่ม:</Text>
                <Text style={styles.groupCreatorName}>{getAdminName}</Text>
              </View>
            )}
            <FlatList
              data={groupMembers}
              keyExtractor={(item) => item._id || item.user?._id}
              renderItem={({ item }) => {
                console.log('🎭 Rendering member in modal:', item);
                return renderMemberItem({ item });
              }}
              style={styles.membersList}
            />
          </View>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <ImageViewer
          imageUrls={selectedModalImage ? [{ url: selectedModalImage }] : []}
          index={0}
          onCancel={() => setImageModalVisible(false)}
          enableSwipeDown={true}
          renderHeader={() => (
            <View style={{
              position: 'absolute',
              top: 50,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              zIndex: 999
            }}>
              <TouchableOpacity 
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.9)',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => {
                  // ปิด Modal ก่อน
                  setImageModalVisible(false);
                  // รอให้ Modal ปิดแล้วค่อยดาวน์โหลด
                  setTimeout(() => {
                    downloadFile(selectedModalImage, `image_${Date.now()}.jpg`);
                  }, 300);
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>📥 ดาวน์โหลด</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setImageModalVisible(false)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  padding: 8
                }}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          renderFooter={() => null}
          backgroundColor="rgba(0,0,0,0.9)"
          enablePreload={true}
          saveToLocalByLongPress={false}
          menuContext={{
            saveToLocal: 'บันทึกรูปภาพ',
            cancel: 'ยกเลิก'
          }}
        />
      </Modal>

      {/* Modal แก้ไขข้อความ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={cancelEditMessage}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>แก้ไขข้อความ</Text>
              <TouchableOpacity onPress={cancelEditMessage} style={styles.editModalCloseButton}>
                <Text style={styles.editModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.editTextInput}
              value={editText}
              onChangeText={setEditText}
              multiline={true}
              placeholder="พิมพ์ข้อความ..."
              autoFocus={true}
            />
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity 
                style={styles.editCancelButton} 
                onPress={cancelEditMessage}
              >
                <Text style={styles.editCancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.editSaveButton, !editText.trim() && styles.editSaveButtonDisabled]} 
                onPress={saveEditMessage}
                disabled={!editText.trim()}
              >
                <Text style={styles.editSaveButtonText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Notification */}
      {successNotification.visible && (
        <View style={styles.successNotification}>
          <Text style={styles.successNotificationText}>
            ✅ {successNotification.message}
          </Text>
        </View>
      )}

      <LoadingOverlay 
        visible={isLoading} 
        message="กำลังโหลดแชทกลุ่ม..." 
      />

      <SuccessTickAnimation
        visible={showSuccess}
        onComplete={() => setShowSuccess(false)}
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5C842' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5C842' },
  loadingText: { color: '#333', fontSize: 16, marginTop: 10 },
  
  // Success Notification Styles
  successNotification: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successNotificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  scrollLoadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F5C842', justifyContent: 'center', alignItems: 'center', zIndex: 9999
  },
  scrollLoadingText: { color: '#333', fontSize: 16, marginTop: 10, textAlign: 'center' },
  
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: 50,
    backgroundColor: '#F5C842', borderBottomWidth: 0
  },
  backButton: { padding: 8, marginRight: 8 },
  backButtonText: { fontSize: 20, color: '#007AFF' },
  groupInfoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  memberCount: { fontSize: 12, color: '#4CAF50' },
  adminIndicator: { fontSize: 11, color: '#007AFF', marginLeft: 4 },
  leaveButton: { backgroundColor: '#ff4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  leaveButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  messagesListContainer: { flex: 1 },
  messagesList: { 
    flex: 1, 
    backgroundColor: 'transparent'
  },
  messagesContainer: { 
    padding: 16,
    flexGrow: 1
  },
  emptyMessagesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyMessageText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500'
  },
  emptyMessageSubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center'
  },
  
  dateContainer: { alignItems: 'center', marginVertical: 16 },
  dateText: {
    backgroundColor: '#E6B800', color: '#333', fontSize: 12,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12
  },
  
  messageContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  myMessage: { justifyContent: 'flex-end' },
  otherMessage: { justifyContent: 'flex-start' },
  
  messageAvatarContainer: { marginRight: 8 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16 },
  messageContentContainer: { maxWidth: '85%', alignItems: 'flex-end' },
  senderName: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 2, marginLeft: 4 },
  
  messageBubble: {
    maxWidth: '85%', // เพิ่มความกว้างสำหรับข้อความยาว
    minWidth: 'auto', // ให้กล่องปรับขนาดตามเนื้อหา
    padding: 12,
    borderRadius: 12, // เปลี่ยนจาก 18 เป็น 12 เพื่อให้เป็นสี่เหลี่ยมมนๆ
    backgroundColor: '#fff', // กล่องข้อความเป็นสีขาว
    flexShrink: 1, // ให้กล่องสามารถหดได้ตามเนื้อหา
    alignSelf: 'flex-start', // ให้กล่องปรับขนาดตามเนื้อหา
  },
  myMessageBubble: { 
    backgroundColor: '#000', 
    borderBottomRightRadius: 12, // ปรับให้สม่ำเสมอ
    alignSelf: 'flex-end', // ให้ข้อความของตัวเองชิดขวา
  },
  otherMessageBubble: {
    backgroundColor: '#fff', 
    borderBottomLeftRadius: 12, // ปรับให้สม่ำเสมอ
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
    elevation: 2
  },
  
  messageText: { 
    fontSize: 16, 
    lineHeight: 22, 
    textAlign: 'left', 
    flexWrap: 'wrap', // ให้ข้อความขึ้นบรรทัดใหม่เมื่อยาวเกินไป
    flexShrink: 1 // ให้ข้อความปรับขนาดได้
  },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#333' },
  messageTime: { fontSize: 11, marginTop: 5 },
  myMessageTime: { color: '#666', textAlign: 'right' },
  otherMessageTime: { color: '#666' },
  
  optimisticMessage: { opacity: 0.7 },
  sendingIndicator: { marginLeft: 8 },
  
  messageInfoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, paddingHorizontal: 4 },
  myMessageInfo: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
  otherMessageInfo: { justifyContent: 'flex-start', alignSelf: 'flex-start' },
  
  // Container สำหรับวางเวลาข้างล่าง
  messageWithTimeContainer: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  messageTimeBottomContainer: {
    alignItems: 'flex-start', // เปลี่ยนจาก center เป็น flex-start เพื่อให้ไปทางซ้าย
    marginTop: 4,
    paddingHorizontal: 5,
  },
  messageTimeBottom: {
    fontSize: 10,
    color: '#666',
    lineHeight: 12,
    textAlign: 'left', // เปลี่ยนจาก center เป็น left
  },
  myMessageTimeBottom: {
    color: '#666',
  },
  otherMessageTimeBottom: {
    color: '#666',
  },
  messageTimeExternal: { fontSize: 11, marginRight: 6 },
  myMessageTimeExternal: { color: '#666', textAlign: 'right' },
  otherMessageTimeExternal: { color: '#666', textAlign: 'left' },

  imageMessageBubble: { padding: 4, borderRadius: 18, marginBottom: 4, backgroundColor: 'transparent' },
  myImageBubble: { alignSelf: 'flex-end' },
  otherImageBubble: { alignSelf: 'flex-start' },
  messageImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 5, borderWidth: 2, borderColor: '#000' },
  imageTimeContainer: { marginTop: 4, alignItems: 'flex-end' },

  fileMessageBubble: { padding: 8, borderRadius: 18, marginBottom: 4, maxWidth: 250 },
  myFileBubble: { backgroundColor: '#000', alignSelf: 'flex-end' },
  otherFileBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  fileIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  fileIconText: { fontSize: 16, color: '#fff' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  fileSize: { fontSize: 12, marginTop: 2 },
  fileTimeContainer: { marginTop: 4, alignItems: 'flex-end' },

  inputContainer: { 
    padding: 16, 
    paddingTop: 8, 
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
    borderTopWidth: 0, // เอาเส้นขอบบนออก
  },
  messageInputRow: {
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    backgroundColor: '#fff', // เปลี่ยนเป็นสีขาว
    borderRadius: 25, 
    paddingHorizontal: 4, 
    paddingVertical: 4,
  },
  plusButton: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#333',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 8,
  },
  plusIcon: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  textInput: {
    flex: 1, 
    borderWidth: 0, 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    marginRight: 8, 
    maxHeight: 100, 
    fontSize: 16, 
    backgroundColor: 'transparent',
  },
  sendTextButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: '#333',
  },
  sendTextLabel: { 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: '500',
  },

  attachmentMenu: {
    position: 'absolute', 
    bottom: 60, 
    left: 20, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 8,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 4, 
    elevation: 5, 
    zIndex: 1000
  },
  attachmentMenuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    minWidth: 120 
  },
  attachmentMenuIcon: { 
    fontSize: 18, 
    marginRight: 12 
  },
  attachmentMenuText: { 
    fontSize: 16, 
    color: '#333' 
  },

  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  removeFileButton: {
    padding: 4,
  },
  selectedFile: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e9ecef'
  },
  selectedImagePreview: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#e9ecef' },
  selectedFileIcon: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center'
  },
  selectedFileIconText: { fontSize: 24, color: '#fff' },
  selectedFileInfo: { flex: 1, marginLeft: 12 },
  selectedFileName: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 4 },
  selectedFileSize: { fontSize: 14, color: '#666' },
  removeSelectedFile: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#ff4757',
    justifyContent: 'center', alignItems: 'center', marginLeft: 10
  },
  removeSelectedFileText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  scrollToBottomButton: {
    position: 'absolute', bottom: 80, right: 20, backgroundColor: 'rgba(0, 122, 255, 0.9)',
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
  },
  scrollToBottomIcon: { fontSize: 18, color: '#fff', fontWeight: 'bold' },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  membersModalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 20
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeModalButton: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center'
  },
  closeModalButtonText: { fontSize: 16, color: '#666' },
  membersList: { padding: 10 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    backgroundColor: '#f9f9f9', marginBottom: 8, borderRadius: 10
  },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  adminBadge: { backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Group Creator Info Styles
  groupCreatorInfo: {
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCreatorLabel: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  groupCreatorName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  imageModalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)' },
  imageModalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageModalContent: { width: '90%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '90%' },
  imageModalButtons: { flexDirection: 'row', marginTop: 20 },
  downloadButton: {
    backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, marginRight: 10
  },
  downloadButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeImageModalButton: { backgroundColor: '#666', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  closeImageModalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Group Management Styles
  manageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  manageOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  groupNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 10,
  },
  updateNameButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateNameButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedUserItem: {
    backgroundColor: '#FFF3CD',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkMark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  usersList: {
    maxHeight: 300,
  },
  addMembersButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  addMembersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editedText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  myEditedText: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherEditedText: {
    color: '#999',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editModalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    maxHeight: 200,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  editCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  editSaveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  editSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteFileButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  // Read Status Styles
  readStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  readStatusIcon: {
    fontSize: 12,
    marginRight: 4,
    fontWeight: 'bold',
  },
  readStatusIconSent: {
    color: '#999', // สีเทาสำหรับ "ส่งแล้ว" (✓)
  },
  readStatusIconRead: {
    color: '#007AFF', // สีน้ำเงินสำหรับ "อ่านแล้ว" (✓✓)
  },
  readStatusBottom: {
    fontSize: 10,
    color: '#666',
    lineHeight: 12,
  },
  myReadStatusBottom: {
    color: '#666',
  },
  otherReadStatusBottom: {
    color: '#666',
  },
  
  // System Message Styles
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  systemMessageText: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: '#666',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    textAlign: 'center',
    overflow: 'hidden',
  },
  systemMessageTime: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  messageLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  fileAttachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  loadingMoreContainer: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  removeMemberButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  removeMemberText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadOlderInList: {
    marginTop: 5,
    backgroundColor: 'transparent'
  },
});

export default GroupChatScreen;
