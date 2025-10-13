import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  Image, TextInput, KeyboardAvoidingView, Platform, Alert, Modal, Dimensions, Animated
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
// Removed loading imports - no longer using loading functionality
import NotificationService from '../../service/notificationService';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const GroupChatScreen = ({ route, navigation }) => {
  const { user: authUser } = useAuth();
  const { socket, joinChatroom } = useSocket();
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
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
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeForMessages, setShowTimeForMessages] = useState(new Set()); // เก็บ ID ของข้อความที่จะแสดงเวลา
  const [timeAnimations, setTimeAnimations] = useState({}); // เก็บ Animated.Value สำหรับแต่ละข้อความ
  const [messageReadCount, setMessageReadCount] = useState({}); // เก็บจำนวนคนที่อ่านข้อความแต่ละข้อความ
  const [selectionMode, setSelectionMode] = useState(false); // โหมดเลือกข้อความ
  const [selectedMessages, setSelectedMessages] = useState([]); // ข้อความที่เลือก
  const [showMenuModal, setShowMenuModal] = useState(false); // Modal สำหรับเมนูตัวเลือก
  const [isLoadingMore, setIsLoadingMore] = useState(false); // สำหรับโหลดข้อความเก่า
  const [hasMoreMessages, setHasMoreMessages] = useState(true); // มีข้อความเก่าเหลืออยู่หรือไม่
  const [currentPage, setCurrentPage] = useState(1); // หน้าปัจจุบัน
  const flatListRef = useRef(null);

  const { 
    groupId, 
    groupName, 
    groupAvatar, 
    refresh, 
    updatedMembers,
    forceRefresh,
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
      loadGroupData();
      // Reset navigation params หลังจาก refresh
      navigation.setParams({ refresh: false, updatedMembers: undefined, forceRefresh: undefined });
    }
  }, [refresh, updatedMembers, forceRefresh]);

  // Debug selection mode
  useEffect(() => {
    console.log('👀 selectionMode changed:', { selectionMode, selectedCount: selectedMessages.length });
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
    console.log('🔍 Checking socket status on component mount...');
    console.log('🔍 Socket exists:', !!socket);
    console.log('🔍 Socket connected:', socket?.connected);
    console.log('🔍 GroupId:', groupId);
    console.log('🔍 AuthUser exists:', !!authUser);
    
    // ตรวจสอบสถานะ Socket และอัปเดต UI
    if (socket) {
      if (socket.connected) {
        setSocketStatus('connected');
      } else {
        setSocketStatus('connecting');
      }
      
      // Listen for socket status changes
      const handleConnect = () => {
        setSocketStatus('connected');
        console.log('🔌 GroupChat: Socket connected');
      };
      
      const handleDisconnect = () => {
        setSocketStatus('connecting');
        console.log('🔌 GroupChat: Socket disconnected, will retry...');
      };
      
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    } else {
      setSocketStatus('connecting');
    }
  }, [socket]);

  // Auto-scroll ไปข้อความล่าสุดเมื่อมีข้อความใหม่ (ทำงานในพื้นหลังระหว่างโหลด)
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToEnd) {
      // รอให้ FlatList render เสร็จแล้วค่อย scroll (ไม่ต้องรอ loading เสร็จ)
      console.log('📍 Auto-scrolling to end on messages change (background):', messages.length);
      
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
      console.log('🎯 Immediate scroll attempt (background):', messages.length);
      
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
        console.log('🎯 Final attempt to scroll to end:', messages.length);
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
    console.log('🔍 Socket useEffect triggered');
    console.log('🔍 socket exists:', !!socket);
    console.log('🔍 socket.connected:', socket?.connected);
    console.log('🔍 groupId:', groupId);
    console.log('🔍 authUser exists:', !!authUser);
    console.log('🔍 authUser._id:', authUser?._id);
    
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
        
        console.log('✅ Message is for this group, processing...');
        console.log('💬 Message sender ID:', data.message?.sender?._id);
        console.log('💬 Current user ID:', authUser._id);
        
        // ไม่รับข้อความจากตัวเองผ่าน socket
        if (data.message?.sender?._id !== authUser._id) {
          // แสดงการแจ้งเตือนสำหรับข้อความจากคนอื่น
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
            console.log('✅ Notification sent successfully');
          } catch (error) {
            console.error('❌ Error showing notification:', error);
          }
          
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => msg._id === data.message._id);
            if (messageExists) return prevMessages;
            
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
                flatListRef.current?.scrollToEnd({ animated: true });
              }
              console.log('🎯 Auto-scrolled to new message from socket');
            }, 100);
            
            return newMessages;
          });
        }
      };

      const handleMessageDeleted = (data) => {
        if (data.chatroomId === groupId) {
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
            console.log('🔄 Socket is now connected, setting up listeners...');
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
            console.log('✅ Socket connection established, cleaning up retry interval');
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

  const loadGroupData = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        // setIsScrollingToEnd(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const [messagesRes, groupRes] = await Promise.all([
        api.get(`/groups/${groupId}/messages?page=${page}&limit=30`),
        page === 1 ? api.get(`/groups/${groupId}`) : Promise.resolve({ data: groupInfo })
      ]);
      
      console.log('📨 Group messages loaded (page ' + page + '):', messagesRes.data);
      if (page === 1) {
        console.log('👥 Group info loaded:', groupRes.data);
      }
      
      const loadedMessages = messagesRes.data.data || messagesRes.data.messages || [];
      const groupData = groupRes.data.data || groupRes.data;
      
      if (loadedMessages.length === 0) {
        if (page === 1) {
          console.log('📨 No messages found - this is a new group chat');
          setMessages([]); // ตั้งค่าเป็น array ว่าง
          setHasScrolledToEnd(true);
        }
        setHasMoreMessages(false);
        // setIsScrollingToEnd(false);
      } else {
        if (append && page > 1) {
          // เพิ่มข้อความเก่าเข้าไปด้านหน้า
          setMessages(prevMessages => [...loadedMessages, ...prevMessages]);
        } else {
          // โหลดข้อความใหม่ทั้งหมด
          setMessages(loadedMessages);
        }
        
        // เช็คว่ามีข้อความเก่าเหลืออยู่อีกหรือไม่
        if (loadedMessages.length < 30) {
          setHasMoreMessages(false);
        }
        
        // เริ่มต้นข้อมูล messageReadCount สำหรับข้อความที่โหลดมา
        const initialReadCount = {};
        loadedMessages.forEach(message => {
          // สำหรับข้อความของตัวเอง ตั้งค่าเริ่มต้นการอ่าน
          if (message.sender?._id === authUser._id) {
            initialReadCount[message._id] = message.readCount || 0;
          }
        });
        
        if (append) {
          setMessageReadCount(prev => ({ ...initialReadCount, ...prev }));
        } else {
          setMessageReadCount(initialReadCount);
        }
      }
      console.log('📨 Messages set, total:', append ? `${messages.length} + ${loadedMessages.length}` : loadedMessages.length);
      if (page === 1) {
        setGroupInfo(groupData);
        
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
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลกลุ่มได้');
    } finally {
      if (page === 1) {
        // setIsScrollingToEnd(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    
    console.log('📥 Loading more messages... Current page:', currentPage);
    const nextPage = currentPage + 1;
    await loadGroupData(nextPage, true);
  };

  const removeMember = async (memberId) => {
    try {
      const { removeGroupMember } = await import('../../service/api');
      await removeGroupMember(groupId, memberId);
      
      // อัปเดตข้อมูลสมาชิกใหม่
      await loadGroupData();
      
      Alert.alert('สำเร็จ', 'ลบสมาชิกออกจากกลุ่มแล้ว');
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบสมาชิกออกจากกลุ่มได้');
    }
  };

  const deleteSelectedMessages = () => {
    if (selectedMessages.length === 0) return;
    
    Alert.alert(
      'ลบข้อความ',
      `คุณต้องการลบ ${selectedMessages.length} ข้อความหรือไม่?\n(ลบเฉพาะในเครื่องของคุณ ไม่ลบจากเซิร์ฟเวอร์)`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            setMessages(prevMessages => 
              prevMessages.filter(msg => !selectedMessages.includes(msg._id))
            );
            setSelectedMessages([]);
            setSelectionMode(false);
            console.log(`✅ Deleted ${selectedMessages.length} messages locally`);
          }
        }
      ]
    );
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && !selectedFile && !selectedImage) || isSending) return;
    
    setIsSending(true);
    const tempId = `temp_${Date.now()}_${authUser._id}`;
    const messageContent = inputText.trim() || (selectedImage ? '📷 รูปภาพ' : '📎 ไฟล์แนบ');
    
    const optimisticMessage = {
      _id: tempId,
      content: messageContent,
      sender: authUser,
      timestamp: new Date().toISOString(),
      messageType: selectedImage ? 'image' : selectedFile ? 'file' : 'text',
      fileUrl: selectedImage?.uri || selectedFile?.uri,
      fileName: selectedImage?.fileName || selectedFile?.name,
      fileSize: selectedImage?.fileSize || selectedFile?.size,
      isTemporary: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll ไปข้อความใหม่
    setTimeout(() => {
      try {
        if (messages.length > 0) {
          flatListRef.current?.scrollToIndex({ 
            index: messages.length, // messages.length เพราะจะเพิ่มข้อความใหม่
            animated: true,
            viewPosition: 1
          });
        }
      } catch (error) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
    
    const messageText = inputText.trim();
    const fileToSend = selectedFile;
    const imageToSend = selectedImage;
    
    setInputText('');
    setSelectedFile(null);
    setSelectedImage(null);
    setShowAttachmentMenu(false);

    try {
      const formData = new FormData();
      formData.append('content', messageText || messageContent);
      
      if (imageToSend) {
        formData.append('file', {
          uri: imageToSend.uri,
          type: imageToSend.mimeType || 'image/jpeg',
          name: imageToSend.fileName || `image_${Date.now()}.jpg`
        });
      } else if (fileToSend) {
        formData.append('file', {
          uri: fileToSend.uri,
          type: fileToSend.mimeType || 'application/octet-stream',
          name: fileToSend.name || fileToSend.fileName || `file_${Date.now()}`
        });
      }

      const endpoint = (imageToSend || fileToSend) ? 
        `/groups/${groupId}/upload` : 
        `/groups/${groupId}/messages`;
      
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ Message sent successfully:', response.data);
      
      // ส่งข้อความผ่าน Socket เพื่อให้สมาชิกคนอื่นได้รับแบบ real-time
      const realMessage = response.data.data || response.data;
      if (socket) {
        if (socket.connected) {
          console.log('📡 Emitting message via socket to group:', groupId);
          socket.emit('sendMessage', {
            chatroomId: groupId,
            message: realMessage
          });
          console.log('✅ Socket emit completed');
        } else {
          console.log('⚠️ Socket exists but not connected yet, message will sync when others refresh');
          console.log('⚠️ Connection state:', {
            connected: socket.connected,
            id: socket.id || 'no-id'
          });
        }
      } else {
        console.log('⚠️ Socket not available - message sent via API only');
      }
      
      // แทนที่ temporary message ด้วยข้อความจริง
      setMessages(prev => {
        const filtered = prev.filter(msg => msg._id !== tempId);
        return [...filtered, realMessage];
      });
      
      // Scroll ไปข้อความใหม่หลังจากได้ response จริง
      setTimeout(() => {
        try {
          const newLength = messages.length; // ความยาวใหม่หลังเพิ่มข้อความ
          flatListRef.current?.scrollToIndex({ 
            index: newLength - 1,
            animated: true,
            viewPosition: 1
          });
        } catch (error) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setInputText(messageText);
      setSelectedFile(fileToSend);
      setSelectedImage(imageToSend);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSending(false);
    }
  };

  const pickFile = async (isImage = false) => {
    try {
      setShowAttachmentMenu(false);
      
      if (isImage) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          // ส่งรูปภาพทันทีโดยไม่ต้องแสดงตัวอย่าง
          await sendImageDirectly(result.assets[0]);
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!result.cancelled && result.assets?.[0]) {
          setSelectedFile(result.assets[0]);
        } else if (result.type === 'success') {
          setSelectedFile(result);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  // ฟังก์ชันส่งรูปภาพทันที
  const sendImageDirectly = async (imageAsset) => {
    if (!groupData?._id || isSending) return;
    
    try {
      setIsSending(true);
      
      const formData = new FormData();
      formData.append('groupId', groupData._id);
      formData.append('senderId', authUser._id);
      formData.append('content', ''); // ข้อความว่าง
      formData.append('messageType', 'image');
      
      formData.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || 'image/jpeg',
        name: imageAsset.fileName || 'image.jpg',
      });

      const response = await api.post('/groups/send-message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        console.log('✅ Image sent successfully');
        // ปิดเมนูแนบไฟล์
        setShowAttachmentMenu(false);
      }
    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งรูปภาพได้');
    } finally {
      setIsSending(false);
    }
  };

  // ฟังก์ชันเปิดรูปภาพในโหมดเต็มจอ
  const openImageModal = (imageUri) => {
    setSelectedModalImage(imageUri);
    setImageModalVisible(true);
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      console.log('📥 Downloading file:', fileUrl);
      console.log('📁 File name:', fileName);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      let fullUrl = fileUrl;
      
      // ตรวจสอบว่าเป็น Cloudinary URL หรือไม่
      if (fileUrl.includes('cloudinary.com')) {
        // ใช้ URL โดยตรงสำหรับ Cloudinary
        fullUrl = fileUrl;
        console.log('🌤️ Using Cloudinary URL directly:', fullUrl);
      } else if (!fileUrl.startsWith('http')) {
        // สำหรับไฟล์ที่เก็บบน server เอง
        fullUrl = `${API_URL}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
        console.log('🏠 Using local server URL:', fullUrl);
      }

      const finalFileName = fileName || `file_${new Date().getTime()}`;
      const fileExtension = finalFileName.split('.').pop()?.toLowerCase() || '';
      
      // ตรวจสอบประเภทไฟล์
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp'].includes(fileExtension);
      const isMedia = isImage || isVideo;

      // สำหรับ Cloudinary ไม่ต้องใช้ Authorization header
      const headers = fileUrl.includes('cloudinary.com') ? {} : { Authorization: `Bearer ${token}` };
      
      if (isMedia) {
        // สำหรับรูปภาพและวิดีโอ - บันทึกไปที่ Gallery/Photos
        try {
          // ขอ permission
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('ข้อผิดพลาด', 'ต้องการสิทธิ์ในการเข้าถึงไฟล์เพื่อบันทึกรูปภาพ/วิดีโอ');
            return;
          }
          
          Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
          
          // ดาวน์โหลดไฟล์ชั่วคราว
          const timestamp = new Date().getTime();
          const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${finalFileName}`;
          
          const downloadResult = await FileSystem.downloadAsync(fullUrl, tempUri, {
            headers: headers
          });

          if (downloadResult.status === 200) {
            // บันทึกไปที่ MediaLibrary (Gallery/Photos)
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            
            // ลบไฟล์ชั่วคราว
            await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
            
            Alert.alert(
              'บันทึกสำเร็จ!',
              isImage ? 
                `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}` : 
                `วิดีโอถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}`
            );
            
            console.log('✅ Media saved to gallery:', asset);
          } else {
            throw new Error(`HTTP ${downloadResult.status}`);
          }
          
        } catch (mediaError) {
          console.error('❌ Error saving to gallery:', mediaError);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกไฟล์ไปที่แกลเลอรี่ได้');
        }
      } else {
        // สำหรับไฟล์อื่นๆ - บันทึกไปที่ Downloads folder
        try {
          Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
          
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
                Alert.alert(
                  'ดาวน์โหลดสำเร็จ',
                  `ไฟล์ถูกบันทึกที่: ${downloadResult.uri}`,
                  [{ text: 'ตกลง', style: 'default' }]
                );
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
              Alert.alert(
                'ดาวน์โหลดสำเร็จ!',
                `ไฟล์ถูกบันทึกไปที่ Downloads folder แล้ว\nชื่อไฟล์: ${cleanFileName}_${timestamp}\n\nคุณสามารถหาไฟล์ได้ใน File Manager > Downloads`,
                [{ text: 'ตกลง', style: 'default' }]
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
                Alert.alert('สำเร็จ', 'ลบกลุ่มแล้ว', [
                  { text: 'ตกลง', onPress: () => navigation.goBack() }
                ]);
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
              Alert.alert('สำเร็จ', 'ออกจากกลุ่มแล้ว', [
                { text: 'ตกลง', onPress: () => navigation.goBack() }
              ]);
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
    
    console.log('🔍 Admin check:', { adminIdString, currentUserIdString, isAdmin: adminIdString === currentUserIdString });
    
    return adminIdString === currentUserIdString;
  };

  const openEditGroupScreen = () => {
    navigation.navigate('EditGroup', { groupId });
  };

  const getAdminName = () => {
    console.log('🔍 getAdminName called');
    console.log('📋 groupInfo:', JSON.stringify(groupInfo, null, 2));
    const adminId = groupInfo?.admin || groupInfo?.creator;
    console.log('👑 admin/creator ID:', adminId);
    console.log('👥 groupMembers count:', groupMembers.length);
    console.log('👤 authUser ID:', authUser?._id);
    
    if (!adminId) {
      console.log('❌ No admin/creator found');
      return 'ไม่ทราบ';
    }
    
    // ตรวจสอบว่า adminId เป็น Object หรือ String
    const adminIdString = typeof adminId === 'object' ? adminId._id || adminId.toString() : adminId.toString();
    console.log('🔑 adminIdString:', adminIdString);
    
    const adminMember = groupMembers.find(member => {
      const memberIdString = typeof member._id === 'object' ? member._id.toString() : member._id.toString();
      return memberIdString === adminIdString;
    });
    
    console.log('👑 Admin member found:', adminMember);
    
    if (adminMember) {
      const name = adminMember.name || 
                  `${adminMember.firstName || ''} ${adminMember.lastName || ''}`.trim() || 
                  adminMember.email || 'ไม่ทราบ';
      console.log('✅ Admin name:', name);
      return name;
    }
    
    // ตรวจสอบว่าเป็นตัวเราเอง
    const currentUserIdString = authUser?._id?.toString();
    if (adminIdString === currentUserIdString) {
      console.log('✅ Admin is current user');
      return 'คุณ';
    }
    
    // ถ้าไม่พบในรายชื่อสมาชิก แต่มีข้อมูล admin object
    if (typeof adminId === 'object' && (adminId.firstName || adminId.name)) {
      const name = adminId.name || `${adminId.firstName || ''} ${adminId.lastName || ''}`.trim();
      console.log('✅ Admin name from admin object:', name);
      return name;
    }
    
    console.log('❌ Admin not found in members');
    return 'ผู้ใช้ที่ออกจากกลุ่มแล้ว';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
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
        <View style={{
          backgroundColor: '#f1f5f9',
          paddingVertical: 8,
          paddingHorizontal: 12,
          marginVertical: 8,
          marginHorizontal: 40,
          borderRadius: 16,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 1,
        }}>
          <Text style={{
            fontSize: 13,
            color: '#64748b',
            textAlign: 'center',
            fontWeight: '500',
          }}>{item.content}</Text>
          <Text style={{
            fontSize: 11,
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: 2,
          }}>{formatDateTime(item.timestamp || item.time)}</Text>
        </View>
      );
    }

    const isMyMessage = item.sender?._id === authUser._id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMessage || 
      new Date(item.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();
    const showTime = shouldShowTime(item, index);

    const handleMessagePress = () => {
      console.log('👆 GROUP handleMessagePress called:', { 
        selectionMode, 
        messageId: item._id,
        selectedMessages: selectedMessages.length 
      });
      
      // Force selection mode to work - direct call
      if (selectionMode) {
        console.log('🎯 In selection mode, calling handleMessageSelect');
        console.log('🔍 Current selectedMessages before:', selectedMessages);
        
        // Direct state update instead of calling function
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
        // Double press detected - แก้ไขข้อความ
        console.log('🔄 Double press - edit message');
        handleMessageDoublePress(item);
      } else {
        // Single press - แสดง/ซ่อนเวลา (สำหรับทุกข้อความ)
        console.log('🔄 Single press - toggle time');
        toggleShowTime(item._id);
        item.lastPress = now;
      }
    };
    
    return (
      <View>
        {showDate && (
          <View style={{
            alignItems: 'center',
            marginVertical: 10,
          }}>
            <Text style={{
              fontSize: 12,
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              paddingVertical: 4,
              paddingHorizontal: 12,
              borderRadius: 12,
              overflow: 'hidden',
            }}>{formatDate(item.timestamp)}</Text>
          </View>
        )}
        
        <View style={{
          flexDirection: 'row',
          marginBottom: 16,
          alignItems: 'flex-end',
          justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
        }}>
          {!isMyMessage && (
            <View style={{ marginRight: 8 }}>
              <Image
                source={{
                  uri: item.sender?.avatar?.startsWith('http') 
                    ? item.sender.avatar 
                    : item.sender?.avatar 
                      ? `${API_URL}${item.sender.avatar}`
                      : 'https://via.placeholder.com/32'
                }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                defaultSource={require('../../assets/default-avatar.jpg')}
              />
            </View>
          )}
          
          <View style={{
            maxWidth: '85%',
            alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
          }}>
            {!isMyMessage && (
              <Text style={{
                fontSize: 12,
                color: '#666',
                fontWeight: '500',
                marginBottom: 2,
                marginLeft: 4,
              }}>
                {item.sender?.firstName} {item.sender?.lastName}
              </Text>
            )}
            
            {/* รูปภาพ - ใช้รูปแบบเดียวกับแชทส่วนตัว */}
            {(item.messageType === 'image' || item.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i)) && (
              <View>
                <View style={[
                  {
                    backgroundColor: isMyMessage ? '#007AFF' : '#ffffff',
                    borderRadius: 16,
                    marginBottom: 4,
                    alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    overflow: 'hidden'
                  },
                  selectedMessages.includes(item._id) && {
                    backgroundColor: 'rgba(0, 122, 255, 0.2)',
                    borderWidth: 3,
                    borderColor: '#007AFF',
                    shadowColor: '#007AFF',
                    shadowOffset: {
                      width: 0,
                      height: 0,
                    },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                    elevation: 8,
                  }
                ]}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🚀 GROUP Image TouchableOpacity onPress fired!');
                      if (selectionMode) {
                        handleMessagePress();
                      } else {
                        openImageModal(item.fileUrl);
                      }
                    }}
                  >
                  {/* Checkbox สำหรับ Selection Mode - รูปภาพ */}
                  {selectionMode && selectedMessages.includes(item._id) && (
                    <View 
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 15,
                        left: isMyMessage ? 15 : 55,
                        zIndex: 10,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#007AFF',
                        backgroundColor: '#007AFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2
                      }}>
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
                    </View>
                  )}
                  
                  <Image
                    source={{
                      uri: (() => {
                        const imageUri = item.fileUrl;
                        return imageUri?.startsWith('http') ? imageUri : `${API_URL}${imageUri}`;
                      })()
                    }}
                    style={{ width: 200, height: 150, borderRadius: 8, marginBottom: 5 }}
                    resizeMode="cover"
                  />
                  
                  {/* ปุ่มลบรูปภาพ - แสดงเฉพาะผู้ส่ง */}
                  {isMyMessage && (
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        Alert.alert(
                          'ลบรูปภาพ',
                          'คุณต้องการลบรูปภาพนี้หรือไม่?',
                          [
                            { text: 'ยกเลิก', style: 'cancel' },
                            { 
                              text: 'ลบ', 
                              style: 'destructive',
                              onPress: () => deleteMessage(item._id)
                            }
                          ]
                        );
                      }}
                    >
                      <Text style={{
                        color: 'white',
                        fontSize: 16,
                        fontWeight: 'bold',
                        lineHeight: 16,
                      }}>×</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                
                {/* วันเวลาอยู่ข้างล่างรูปภาพ (ซ้าย) - แสดงเฉพาะข้อความล่าสุดหรือที่ถูกคลิก */}
                {(showTime || showTimeForMessages.has(item._id)) && (
                  <Animated.View
                    style={{
                      alignItems: 'flex-start',
                      marginTop: 4,
                      paddingHorizontal: 5,
                      opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
                      maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                        (timeAnimations[item._id]).interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 30]
                        }) : 0)
                    }}
                  >
                    <Text style={{
                      fontSize: 10,
                      color: '#666',
                      lineHeight: 12,
                      textAlign: 'left',
                    }}>
                      {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                    {/* สถานะอ่าน/ไม่อ่าน สำหรับข้อความของตัวเอง - รูปภาพ */}
                    {isMyMessage && !item.isTemporary && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 2,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: getGroupReadStatus(item).isRead ? '#10b981' : '#64748b',
                          marginRight: 4,
                        }}>
                          {getGroupReadStatus(item).isRead ? '✓✓' : '✓'}
                        </Text>
                        <Text style={{
                          fontSize: 9,
                          color: '#666',
                        }}>
                          {getGroupReadStatus(item).text}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                )}
                </View>
              </View>
            )}

            {/* ไฟล์ - ใช้รูปแบบเดียวกับแชทส่วนตัว */}
            {item.messageType === 'file' && !item.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) && (
              <View>
                <View style={[
                  {
                    padding: 4,
                    borderRadius: 18,
                    marginBottom: 4,
                    backgroundColor: 'transparent',
                    alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                  },
                  selectedMessages.includes(item._id) && {
                    backgroundColor: 'rgba(0, 122, 255, 0.2)',
                    borderWidth: 3,
                    borderColor: '#007AFF',
                    shadowColor: '#007AFF',
                    shadowOffset: {
                      width: 0,
                      height: 0,
                    },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                    elevation: 8,
                  }
                ]}>
                  <TouchableOpacity
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        minWidth: 200,
                      },
                      isMyMessage ? {
                        backgroundColor: '#007AFF',
                      } : {
                        backgroundColor: '#fff',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    ]}
                  onPress={() => {
                      console.log('🚀 GROUP File TouchableOpacity onPress fired!');
                      if (selectionMode) {
                        handleMessagePress();
                      } else {
                        downloadFile(item.fileUrl, item.fileName || 'downloaded_file');
                      }
                    }}
                  >
                  {/* Checkbox สำหรับ Selection Mode - ไฟล์ */}
                  {selectionMode && selectedMessages.includes(item._id) && (
                    <View 
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: isMyMessage ? 10 : 50,
                        zIndex: 10,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#007AFF',
                        backgroundColor: '#007AFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2
                      }}>
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
                    </View>
                  )}
                  
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    position: 'relative',
                  }}>
                    <View style={{
                      marginRight: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 28,
                      height: 28,
                    }}>
                      {getFileIcon(item.fileName)}
                    </View>
                    <View style={{
                      flex: 1,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '500',
                        color: isMyMessage ? "#fff" : "#333",
                        marginBottom: 2,
                      }} numberOfLines={2}>
                        {decodeFileName(item.fileName)}
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: isMyMessage ? "rgba(255,255,255,0.8)" : "#666",
                      }}>
                        {item.fileSize ? formatFileSize(item.fileSize) : 'ขนาดไม่ทราบ'}
                      </Text>
                    </View>
                  </View>
                    
                    {/* ปุ่มลบไฟล์ - แสดงเฉพาะผู้ส่ง */}
                    {isMyMessage && (
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#ef4444',
                          borderRadius: 12,
                          width: 24,
                          height: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          Alert.alert(
                            'ลบไฟล์',
                            'คุณต้องการลบไฟล์นี้หรือไม่?',
                            [
                              { text: 'ยกเลิก', style: 'cancel' },
                              { 
                                text: 'ลบ', 
                                style: 'destructive',
                                onPress: () => deleteMessage(item._id)
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={{
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 'bold',
                          lineHeight: 14,
                        }}>×</Text>
                      </TouchableOpacity>
                    )}
                </TouchableOpacity>
                
                {/* วันเวลาอยู่ข้างล่างไฟล์ (ซ้าย) - แสดงเฉพาะข้อความล่าสุดหรือที่ถูกคลิก */}
                {(showTime || showTimeForMessages.has(item._id)) && (
                  <Animated.View
                    style={{
                      alignItems: 'flex-start',
                      marginTop: 4,
                      paddingHorizontal: 5,
                      opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
                      maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                        (timeAnimations[item._id]).interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 30]
                        }) : 0)
                    }}
                  >
                    <Text style={{
                      fontSize: 10,
                      color: '#666',
                      lineHeight: 12,
                      textAlign: 'left',
                    }}>
                      {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                    {/* สถานะอ่าน/ไม่อ่าน สำหรับข้อความของตัวเอง - ไฟล์ */}
                    {isMyMessage && !item.isTemporary && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 2,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: getGroupReadStatus(item).isRead ? '#10b981' : '#64748b',
                          marginRight: 4,
                        }}>
                          {getGroupReadStatus(item).isRead ? '✓✓' : '✓'}
                        </Text>
                        <Text style={{
                          fontSize: 9,
                          color: '#666',
                        }}>
                          {getGroupReadStatus(item).text}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                )}
                </View>
              </View>
            )}

            {/* ข้อความธรรมดา */}
            {(item.messageType === 'text' || (item.content && item.content.trim() !== '' && item.content !== '📷 รูปภาพ' && item.content !== '📎 ไฟล์แนบ')) && (
              <View>
                <TouchableOpacity
                  style={[
                    {
                      maxWidth: '85%',
                      minWidth: 'auto',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isMyMessage ? '#007AFF' : '#f1f5f9',
                      flexShrink: 1,
                      alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                      borderBottomRightRadius: isMyMessage ? 12 : 12,
                      borderBottomLeftRadius: isMyMessage ? 12 : 12,
                      shadowColor: isMyMessage ? 'transparent' : '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isMyMessage ? 0 : 0.1,
                      shadowRadius: 2,
                      elevation: isMyMessage ? 0 : 2,
                      opacity: item.isTemporary ? 0.7 : 1,
                    },
                    selectedMessages.includes(item._id) && {
                      backgroundColor: 'rgba(0, 122, 255, 0.2)',
                      borderWidth: 3,
                      borderColor: '#007AFF',
                      shadowColor: '#007AFF',
                      shadowOffset: {
                        width: 0,
                        height: 0,
                      },
                      shadowOpacity: 0.8,
                      shadowRadius: 8,
                      elevation: 8,
                    }
                  ]}
                  onLongPress={() => isMyMessage && deleteMessage(item._id)}
                  onPress={() => {
                    console.log('🚀 GROUP TouchableOpacity onPress fired!');
                    handleMessagePress();
                  }}
                  delayLongPress={800}
                  activeOpacity={0.7}
                >
                  {/* Checkbox สำหรับ Selection Mode - แสดงเฉพาะข้อความที่ถูกเลือก */}
                  {selectionMode && selectedMessages.includes(item._id) && (
                    <View 
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: isMyMessage ? 10 : 50,
                        zIndex: 10,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#007AFF',
                        backgroundColor: '#007AFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2
                      }}>
                      <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
                    </View>
                  )}
                  
                  <Text style={{
                    fontSize: 16,
                    lineHeight: 22,
                    textAlign: 'left',
                    flexWrap: 'wrap',
                    flexShrink: 1,
                    color: isMyMessage ? '#ffffff' : '#1f2937',
                  }}>
                    {item.content}
                  </Text>
                  {item.editedAt && (
                    <Text style={{
                      fontSize: 11,
                      fontStyle: 'italic',
                      marginTop: 4,
                      color: isMyMessage ? 'rgba(255,255,255,0.7)' : '#64748b',
                    }}>
                      แก้ไขแล้ว
                    </Text>
                  )}
                  {item.isSending && (
                    <ActivityIndicator 
                      size="small" 
                      color={isMyMessage ? "#333" : "#666"} 
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
                
                {/* วันเวลาอยู่ข้างล่างข้อความ (ซ้าย) - แสดงเฉพาะข้อความล่าสุดหรือที่ถูกคลิก */}
                {(showTime || showTimeForMessages.has(item._id)) && (
                  <Animated.View
                    style={{
                      alignItems: 'flex-start',
                      marginTop: 4,
                      paddingHorizontal: 5,
                      opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
                      maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                        (timeAnimations[item._id]).interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 30]
                        }) : 0)
                    }}
                  >
                    <Text style={{
                      fontSize: 10,
                      color: '#666',
                      lineHeight: 12,
                      textAlign: 'left',
                    }}>
                      {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                    {/* สถานะอ่าน/ไม่อ่าน สำหรับข้อความของตัวเอง - ข้อความธรรมดา */}
                    {isMyMessage && !item.isTemporary && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 2,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          color: getGroupReadStatus(item).isRead ? '#10b981' : '#64748b',
                          marginRight: 4,
                        }}>
                          {getGroupReadStatus(item).isRead ? '✓✓' : '✓'}
                        </Text>
                        <Text style={{
                          fontSize: 9,
                          color: '#666',
                        }}>
                          {getGroupReadStatus(item).text}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                )}
              </View>
            )}
          </View>
        </View>
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
              {(groupInfo?.admin || groupInfo?.creator) ? (
                <Text style={{
                  fontSize: 12,
                  color: '#6b7280',
                  marginLeft: 4
                }}>
                  • สร้างโดย {getAdminName()}
                </Text>
              ) : (
                <Text style={{
                  fontSize: 12,
                  color: '#6b7280',
                  marginLeft: 4
                }}>
                  • กำลังโหลดข้อมูล...
                </Text>
              )}
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
              {/* ปุ่มเมนู - แสดง Modal ตัวเลือก */}
              <TouchableOpacity
                onPress={() => {
                  console.log('🔄 Opening group menu modal');
                  setShowMenuModal(true);
                }}
                style={{ 
                  padding: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#007AFF',
                  borderRadius: 8,
                  minWidth: 50,
                  minHeight: 40,
                  marginRight: 8
                }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                  เมนู
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ปุ่มจัดการกลุ่ม (แสดงเฉพาะผู้สร้างกลุ่ม) */}
          {(() => {
            const isAdmin = isGroupAdmin();
            console.log('🔧 Showing manage button:', isAdmin);
            return isAdmin;
          })() && (
            <TouchableOpacity 
              onPress={openEditGroupScreen} 
              style={{
                padding: 8,
                marginRight: 8
              }}
            >
              <Text style={{
                fontSize: 18,
                color: '#6b7280'
              }}>⚙️</Text>
            </TouchableOpacity>
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
            if (messages.length > 0 && !hasScrolledToEnd) {
              console.log('📏 Content size changed, scrolling to end due to new messages. Messages:', messages.length);
              // scroll ทันทีโดยไม่รอ hasScrolledToEnd
              setTimeout(() => {
                if (flatListRef.current && messages.length > 0) {
                  flatListRef.current.scrollToEnd({ animated: false });
                  setHasScrolledToEnd(true);
                  // setIsScrollingToEnd(false);
                }
              }, 50); // ลดจาก 100ms เหลือ 50ms
            }
          }}
          onLayout={() => {
            // เมื่อ FlatList layout เสร็จ - scroll เฉพาะเมื่อยังไม่เคย scroll (ระหว่างโหลด)
            if (messages.length > 0 && !hasScrolledToEnd) {
              console.log('📐 FlatList layout complete, scrolling to end due to initial load');
              setTimeout(() => {
                if (flatListRef.current && messages.length > 0) {
                  flatListRef.current.scrollToEnd({ animated: false });
                  setHasScrolledToEnd(true);
                  // setIsScrollingToEnd(false);
                }
              }, 10); // เร็วมาก
            }
          }}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            setShowScrollToBottom(!isAtBottom);
          }}
          scrollEventThrottle={16}
          ListHeaderComponent={() => (
            hasMoreMessages && messages.length > 0 ? (
              <View style={styles.loadingMoreContainer}>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreMessages}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Text style={styles.loadMoreText}>โหลดข้อความเก่า</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null
          )}
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

      {/* Input Area */}
      <View style={{
        padding: 16,
        paddingTop: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
      }}>
        {/* Attachment Menu - Telegram Style */}
        {showAttachmentMenu && (
          <View style={{
            position: 'absolute',
            bottom: 80,
            left: 20,
            right: 20,
            backgroundColor: 'white',
            borderRadius: 16,
            paddingVertical: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
            zIndex: 1000,
            borderWidth: 1,
            borderColor: '#e2e8f0'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  minWidth: 80
                }}
                onPress={() => pickFile(true)}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#10b981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Text style={{ fontSize: 24 }}>🖼️</Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#1e293b',
                  textAlign: 'center'
                }}>รูปภาพ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                  minWidth: 80
                }}
                onPress={() => pickFile(false)}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Text style={{ fontSize: 24 }}>�</Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#1e293b',
                  textAlign: 'center'
                }}>ไฟล์</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Selected File/Image Preview */}
        {selectedFile && (
          <View style={{
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            margin: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: '#3b82f6',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  backgroundColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Text style={{ fontSize: 24 }}>📎</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: 2
                  }}>
                    📄 ไฟล์แนบ
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#64748b'
                  }} numberOfLines={1}>
                    {selectedFile.name || selectedFile.fileName || 'ไฟล์ที่เลือก'} • {selectedFile.size ? Math.round(selectedFile.size / 1024) + ' KB' : ''}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={() => { setSelectedFile(null); }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#ef4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8
                }}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#f8fafc',
          borderRadius: 24,
          paddingHorizontal: 6,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1
        }}>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#3b82f6',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
            onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
          >
            <Text style={{
              fontSize: 18,
              color: '#ffffff',
              fontWeight: 'bold',
            }}>+</Text>
          </TouchableOpacity>
          
          <TextInput
            style={{
              flex: 1,
              borderWidth: 0,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 8,
              maxHeight: 100,
              fontSize: 16,
              backgroundColor: 'transparent',
              color: '#1f2937'
            }}
            value={inputText}
            onChangeText={setInputText}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            keyboardType="default"
            returnKeyType="send"
            autoCorrect={true}
            spellCheck={true}
            autoCapitalize="sentences"
            onSubmitEditing={(event) => {
              if (!event.nativeEvent.text.includes('\n') && inputText.trim()) {
                sendMessage();
              }
            }}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={{
              backgroundColor: (!inputText.trim() && !selectedFile && !selectedImage) || isSending ? '#9ca3af' : '#3b82f6',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              minWidth: 60,
            }}
            onPress={sendMessage}
            disabled={(!inputText.trim() && !selectedFile && !selectedImage) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{
                color: '#ffffff',
                fontWeight: '600',
                fontSize: 14,
              }}>ส่ง</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
                <Text style={styles.groupCreatorName}>{getAdminName()}</Text>
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
                onPress={() => downloadFile(selectedModalImage, `image_${Date.now()}.jpg`)}
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

      {/* Modal สำหรับตัวเลือกเมนู - Dropdown ขวาบน */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={{
            position: 'absolute',
            top: 80, // ห่างจากขอบบน
            right: 16, // ห่างจากขอบขวา
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            width: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8
          }}>
            {/* ปุ่มเลือกข้อความเพื่อลบ */}
            <TouchableOpacity
              onPress={() => {
                console.log('🔄 Entering selection mode from menu');
                setShowMenuModal(false);
                setSelectionMode(true);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: '#F0F8FF',
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: '#007AFF',
                fontSize: 14,
                fontWeight: '500'
              }}>
                เลือกข้อความเพื่อลบ
              </Text>
            </TouchableOpacity>

            {/* ปุ่มออกกลุ่ม */}
            <TouchableOpacity
              onPress={() => {
                setShowMenuModal(false);
                leaveGroup();
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: '#FFF0F0',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: '#FF3B30',
                fontSize: 14,
                fontWeight: '500'
              }}>
                ออกจากกลุ่ม
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5C842' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5C842' },
  loadingText: { color: '#333', fontSize: 16, marginTop: 10 },
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
    backgroundColor: '#fff', 
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
  myMessageText: { color: '#333' },
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
  messageImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 5 },
  imageTimeContainer: { marginTop: 4, alignItems: 'flex-end' },

  fileMessageBubble: { padding: 8, borderRadius: 18, marginBottom: 4, maxWidth: 250 },
  myFileBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
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
});

export default GroupChatScreen;
