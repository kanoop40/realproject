import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  Image, TextInput, KeyboardAvoidingView, Platform, Alert, Modal, Dimensions, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const GroupChatScreen = ({ route, navigation }) => {
  const { user: authUser } = useAuth();
  const { socket, joinChatroom } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScrollingToEnd, setIsScrollingToEnd] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeForMessages, setShowTimeForMessages] = useState(new Set()); // เก็บ ID ของข้อความที่จะแสดงเวลา
  const [timeAnimations, setTimeAnimations] = useState({}); // เก็บ Animated.Value สำหรับแต่ละข้อความ
  const flatListRef = useRef(null);

  const { groupId, groupName, groupAvatar } = route.params || {};

  useEffect(() => {
    loadGroupData();
  }, []);

  // Auto-scroll ไปข้อความล่าสุดเมื่อมีข้อความใหม่
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToEnd) {
      // รอให้ FlatList render เสร็จแล้วค่อย scroll
      console.log('📍 Auto-scrolling to end on messages change:', messages.length);
      
      // ใช้ requestAnimationFrame เพื่อให้แน่ใจว่า render เสร็จแล้ว
      const timeoutId = setTimeout(() => {
        const scrollToEnd = () => {
          try {
            if (messages.length > 0) {
              flatListRef.current?.scrollToIndex({ 
                index: messages.length - 1, 
                animated: false,
                viewPosition: 1
              });
            }
          } catch (error) {
            console.log('ScrollToIndex failed, using scrollToEnd:', error);
            flatListRef.current?.scrollToEnd({ animated: false });
          }
          setHasScrolledToEnd(true);
          setIsScrollingToEnd(false);
        };
        requestAnimationFrame(scrollToEnd);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, hasScrolledToEnd]);

  // Force scroll เมื่อโหลดข้อความเสร็จและไม่ loading แล้ว
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !hasScrolledToEnd) {
      const forceScroll = () => {
        console.log('🚀 Force scrolling to end after loading complete:', messages.length);
        try {
          if (messages.length > 0) {
            flatListRef.current?.scrollToIndex({ 
              index: messages.length - 1, 
              animated: false,
              viewPosition: 1
            });
          }
        } catch (error) {
          console.log('ScrollToIndex failed, using scrollToEnd:', error);
          flatListRef.current?.scrollToEnd({ animated: false });
        }
        // ลอง scroll อีกครั้งหลังจาก 200ms
        setTimeout(() => {
          try {
            if (messages.length > 0) {
              flatListRef.current?.scrollToIndex({ 
                index: messages.length - 1, 
                animated: false,
                viewPosition: 1
              });
            }
          } catch (error) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
          setHasScrolledToEnd(true);
          setIsScrollingToEnd(false);
        }, 200);
      };
      
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(forceScroll);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, messages.length, hasScrolledToEnd]);

  // เพิ่ม useEffect เพื่อ force scroll หลังจาก component mount และมีข้อความ
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // รอ 1 วินาทีแล้วลอง scroll อีกครั้ง ในกรณีที่ useEffect อื่นไม่ทำงาน
      const finalScrollTimeout = setTimeout(() => {
        console.log('🎯 Final attempt to scroll to end:', messages.length);
        try {
          if (messages.length > 0) {
            flatListRef.current?.scrollToIndex({ 
              index: messages.length - 1, 
              animated: false,
              viewPosition: 1
            });
          }
        } catch (error) {
          flatListRef.current?.scrollToEnd({ animated: false });
        }
      }, 1000);
      
      return () => clearTimeout(finalScrollTimeout);
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    if (socket && groupId && authUser) {
      console.log('🔌 Setting up GroupChat socket listeners for group:', groupId);
      console.log('👤 Current user:', authUser._id);
      
      // Reset scroll flags เมื่อเข้าแชทใหม่
      setHasScrolledToEnd(false);
      setIsScrollingToEnd(true);
      
      joinChatroom(groupId);
      
      const handleNewMessage = (data) => {
        console.log('💬 GroupChat received new message:', data);
        
        if (data.chatroomId !== groupId) return;
        
        // ไม่รับข้อความจากตัวเองผ่าน socket
        if (data.message?.sender?._id !== authUser._id) {
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

      socket.on('newMessage', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);
      socket.on('message_edited', handleMessageEdited);
      
      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
        socket.off('message_edited', handleMessageEdited);
      };
    }
  }, [groupId, socket, authUser]);

  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      setIsScrollingToEnd(true);
      
      const [messagesRes, groupRes] = await Promise.all([
        api.get(`/groups/${groupId}/messages`),
        api.get(`/groups/${groupId}`)
      ]);
      
      console.log('📨 Group messages loaded:', messagesRes.data);
      console.log('👥 Group info loaded:', groupRes.data);
      
      const loadedMessages = messagesRes.data.data || messagesRes.data.messages || [];
      const groupData = groupRes.data.data || groupRes.data;
      
      if (loadedMessages.length === 0) {
        console.log('📨 No messages found - this is a new group chat');
        setMessages([]); // ตั้งค่าเป็น array ว่าง
      } else {
        setMessages(loadedMessages);
      }
      console.log('📨 Messages set, total:', loadedMessages.length);
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
      console.log('� Group creator ID:', groupData.creator);
      console.log('�🔍 Admin member found:', transformedMembers.find(m => m._id === (groupData.admin || groupData.creator)));
      console.log('👤 Current user ID:', authUser?._id);
      
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลกลุ่มได้');
    } finally {
      setIsLoading(false);
    }
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
      
      // แทนที่ temporary message ด้วยข้อความจริง
      setMessages(prev => {
        const filtered = prev.filter(msg => msg._id !== tempId);
        const realMessage = response.data.data || response.data;
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
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setSelectedImage(result.assets[0]);
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

  const downloadFile = async (fileUrl, fileName) => {
    try {
      console.log('📥 Downloading file:', fileUrl);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        fullUrl = `${API_URL}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
      }

      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      
      const timestamp = new Date().getTime();
      const finalFileName = fileName || `file_${timestamp}`;
      const localUri = `${downloadDir}${finalFileName}`;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('ดาวน์โหลดเรียบร้อย', `ไฟล์ถูกบันทึกที่: ${downloadResult.uri}`);
        }
      } else {
        throw new Error(`HTTP ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดได้');
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

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender?._id === authUser._id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMessage || 
      new Date(item.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();
    const showTime = shouldShowTime(item, index);

    const handleMessagePress = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      
      if (item.lastPress && (now - item.lastPress) < DOUBLE_PRESS_DELAY) {
        // Double press detected - แก้ไขข้อความ
        handleMessageDoublePress(item);
      } else {
        // Single press - แสดง/ซ่อนเวลา (เฉพาะข้อความที่ไม่ใช่ล่าสุด)
        if (index !== messages.length - 1) {
          toggleShowTime(item._id);
        }
        item.lastPress = now;
      }
    };
    
    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}
        
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          {!isMyMessage && (
            <View style={styles.messageAvatarContainer}>
              <Image
                source={{
                  uri: item.sender?.avatar?.startsWith('http') 
                    ? item.sender.avatar 
                    : item.sender?.avatar 
                      ? `${API_URL}${item.sender.avatar}`
                      : 'https://via.placeholder.com/32'
                }}
                style={styles.messageAvatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            </View>
          )}
          
          <View style={[styles.messageContentContainer, isMyMessage ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
            {!isMyMessage && (
              <Text style={styles.senderName}>
                {item.sender?.firstName} {item.sender?.lastName}
              </Text>
            )}
            
            {/* รูปภาพ */}
            {(item.messageType === 'image' || item.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i)) && (
              <View>
                <TouchableOpacity
                  style={[styles.imageMessageBubble, isMyMessage ? styles.myImageBubble : styles.otherImageBubble]}
                  onPress={() => {
                    const imageUri = item.fileUrl;
                    setSelectedModalImage(imageUri?.startsWith('http') ? imageUri : `${API_URL}${imageUri}`);
                    setImageModalVisible(true);
                  }}
                >
                  <Image
                    source={{
                      uri: (() => {
                        const imageUri = item.fileUrl;
                        return imageUri?.startsWith('http') ? imageUri : `${API_URL}${imageUri}`;
                      })()
                    }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                
                {/* วันเวลาอยู่ข้างล่างรูปภาพ (ซ้าย) - แสดงเฉพาะข้อความล่าสุดหรือที่ถูกคลิก */}
                {(showTime || showTimeForMessages.has(item._id)) && (
                  <Animated.View
                    style={[
                      styles.messageTimeBottomContainer,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom,
                      {
                        opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
                        maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                          (timeAnimations[item._id]).interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 30]
                          }) : 0)
                      }
                    ]}
                  >
                    <Text style={[
                      styles.messageTimeBottom,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
                    ]}>
                      {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                  </Animated.View>
                )}
              </View>
            )}

            {/* ไฟล์ */}
            {item.messageType === 'file' && !item.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) && (
              <View>
                <TouchableOpacity
                  style={[styles.fileMessageBubble, isMyMessage ? styles.myFileBubble : styles.otherFileBubble]}
                  onPress={() => downloadFile(item.fileUrl, item.fileName)}
                >
                  <View style={styles.fileAttachment}>
                    <View style={styles.fileIcon}>
                      <Text style={styles.fileIconText}>📄</Text>
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: isMyMessage ? "#fff" : "#333" }]} numberOfLines={1}>
                        {item.fileName || 'ไฟล์แนบ'}
                      </Text>
                      <Text style={[styles.fileSize, { color: isMyMessage ? "rgba(255,255,255,0.8)" : "#666" }]}>
                        {formatFileSize(item.fileSize)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                {/* วันเวลาอยู่ข้างล่างไฟล์ (ซ้าย) - แสดงเฉพาะข้อความล่าสุดหรือที่ถูกคลิก */}
                {(showTime || showTimeForMessages.has(item._id)) && (
                  <Animated.View
                    style={[
                      styles.messageTimeBottomContainer,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom,
                      {
                        opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
                        maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                          (timeAnimations[item._id]).interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 30]
                          }) : 0)
                      }
                    ]}
                  >
                    <Text style={[
                      styles.messageTimeBottom,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
                    ]}>
                      {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                  </Animated.View>
                )}
              </View>
            )}

            {/* ข้อความธรรมดา */}
            {(item.messageType === 'text' || (item.content && item.content.trim() !== '' && item.content !== '📷 รูปภาพ' && item.content !== '📎 ไฟล์แนบ')) && (
              <View>
                <TouchableOpacity
                  style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, item.isTemporary && styles.optimisticMessage]}
                  onLongPress={() => isMyMessage && deleteMessage(item._id)}
                  onPress={handleMessagePress}
                  delayLongPress={800}
                >
                  <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                    {item.content}
                  </Text>
                  {item.editedAt && (
                    <Text style={[styles.editedText, isMyMessage ? styles.myEditedText : styles.otherEditedText]}>
                      แก้ไขแล้ว
                    </Text>
                  )}
                  {item.isSending && (
                    <ActivityIndicator 
                      size="small" 
                      color={isMyMessage ? "#FFA500" : "#666"} 
                      style={styles.sendingIndicator}
                    />
                  )}
                </TouchableOpacity>
                
                {/* วันเวลาอยู่ข้างล่างข้อความ (ซ้าย) - แสดงเฉพาะข้อความล่าสุดหรือที่ถูกคลิก */}
                {(showTime || showTimeForMessages.has(item._id)) && (
                  <Animated.View
                    style={[
                      styles.messageTimeBottomContainer,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom,
                      {
                        opacity: showTime ? 1 : (timeAnimations[item._id] || new Animated.Value(0)),
                        maxHeight: showTime ? 'auto' : (timeAnimations[item._id] ? 
                          (timeAnimations[item._id]).interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 30]
                          }) : 0)
                      }
                    ]}
                  >
                    <Text style={[
                      styles.messageTimeBottom,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
                    ]}>
                      {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
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
        {isCreator && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ผู้สร้าง</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={styles.loadingText}>กำลังโหลดข้อความ...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Loading overlay สำหรับการ scroll */}
      {isScrollingToEnd && (
        <View style={styles.scrollLoadingOverlay}>
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={styles.scrollLoadingText}>กำลังไปที่ข้อความล่าสุด...</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.groupInfoContainer}
          onPress={() => {
            console.log('🔄 Refreshing group info...');
            setShowMembersModal(true);
            // Force refresh group data
            loadGroupData();
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
            style={styles.headerAvatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{groupInfo?.name || groupName}</Text>
            <View style={styles.headerSubtitle}>
              <Text style={styles.memberCount}>{groupMembers.length} สมาชิก</Text>
              {(groupInfo?.admin || groupInfo?.creator) ? (
                <Text style={styles.adminIndicator}>
                  • สร้างโดย {getAdminName()}
                </Text>
              ) : (
                <Text style={styles.adminIndicator}>
                  • กำลังโหลดข้อมูล...
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* ปุ่มจัดการกลุ่ม (แสดงเฉพาะผู้สร้างกลุ่ม) */}
        {(() => {
          const isAdmin = isGroupAdmin();
          console.log('🔧 Showing manage button:', isAdmin);
          return isAdmin;
        })() && (
          <TouchableOpacity onPress={openEditGroupScreen} style={styles.manageButton}>
            <Text style={styles.manageButtonText}>⚙️</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={leaveGroup} style={styles.leaveButton}>
          <Text style={styles.leaveButtonText}>ออก</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <TouchableOpacity 
        style={styles.messagesListContainer}
        activeOpacity={1}
        onPress={() => setShowAttachmentMenu(false)}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id?.toString() || `message_${index}_${item.timestamp}`}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContainer,
            messages.length === 0 && styles.emptyMessagesContainer // เพิ่ม style เมื่อไม่มีข้อความ
          ]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
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
            // Auto-scroll ไปข้อความล่าสุดเมื่อเข้าแชทใหม่
            if (messages.length > 0 && !hasScrolledToEnd) {
              console.log('📏 Content size changed, auto-scrolling to end. Messages:', messages.length);
              // ใช้ scrollToIndex เพื่อไปที่ข้อความสุดท้าย
              const scrollToLastMessage = () => {
                try {
                  if (messages.length > 0) {
                    flatListRef.current?.scrollToIndex({ 
                      index: messages.length - 1, 
                      animated: false,
                      viewPosition: 1 // 1 = ข้อความอยู่ด้านล่างสุด
                    });
                  }
                } catch (error) {
                  // ถ้า scrollToIndex ไม่ได้ ใช้ scrollToEnd
                  console.log('ScrollToIndex failed, using scrollToEnd:', error);
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
                setHasScrolledToEnd(true);
                setIsScrollingToEnd(false);
              };
              
              setTimeout(() => {
                requestAnimationFrame(scrollToLastMessage);
              }, 400);
            }
          }}
          onLayout={() => {
            // เมื่อ FlatList layout เสร็จ
            if (messages.length > 0 && !hasScrolledToEnd) {
              setTimeout(() => {
                console.log('📐 FlatList layout complete, scrolling to end');
                try {
                  flatListRef.current?.scrollToIndex({ 
                    index: messages.length - 1, 
                    animated: false,
                    viewPosition: 1
                  });
                } catch (error) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }, 100);
            }
          }}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            setShowScrollToBottom(!isAtBottom);
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        />
      </TouchableOpacity>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={() => {
            try {
              if (messages.length > 0) {
                flatListRef.current?.scrollToIndex({ 
                  index: messages.length - 1, 
                  animated: true,
                  viewPosition: 1
                });
              }
            } catch (error) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
            setShowScrollToBottom(false);
          }}
        >
          <Text style={styles.scrollToBottomIcon}>↓</Text>
        </TouchableOpacity>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <View style={styles.attachmentMenu}>
            <TouchableOpacity style={styles.attachmentMenuItem} onPress={() => pickFile(true)}>
              <Text style={styles.attachmentMenuIcon}>🖼️</Text>
              <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentMenuItem} onPress={() => pickFile(false)}>
              <Text style={styles.attachmentMenuIcon}>📄</Text>
              <Text style={styles.attachmentMenuText}>ไฟล์</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Selected File/Image Preview */}
        {(selectedFile || selectedImage) && (
          <View style={styles.selectedFileContainer}>
            <View style={styles.selectedFile}>
              {selectedImage && (
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImagePreview} />
              )}
              <View style={styles.selectedFileIcon}>
                <Text style={styles.selectedFileIconText}>{selectedImage ? '🖼️' : '📄'}</Text>
              </View>
              <View style={styles.selectedFileInfo}>
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {selectedImage?.fileName || selectedFile?.name || selectedFile?.fileName || 'ไฟล์ที่เลือก'}
                </Text>
                <Text style={styles.selectedFileSize}>
                  {formatFileSize(selectedImage?.fileSize || selectedFile?.size)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.removeSelectedFile}
                onPress={() => { setSelectedFile(null); setSelectedImage(null); }}
              >
                <Text style={styles.removeSelectedFileText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.messageInputRow}>
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
          >
            <Text style={styles.plusIcon}>+</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={(text) => setInputText(text.replace(/\n/g, ' '))}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#999"
            multiline={false}
            numberOfLines={1}
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={styles.sendTextButton}
            onPress={sendMessage}
            disabled={(!inputText.trim() && !selectedFile && !selectedImage) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendTextLabel}>ส่ง</Text>
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

      {/* Image Modal */}
      <Modal visible={imageModalVisible} transparent>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalBackground}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.imageModalContent}>
              <Image
                source={{ uri: selectedModalImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.imageModalButtons}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => downloadFile(selectedModalImage, `image_${Date.now()}.jpg`)}
                >
                  <Text style={styles.downloadButtonText}>💾 บันทึก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeImageModalButton}
                  onPress={() => setImageModalVisible(false)}
                >
                  <Text style={styles.closeImageModalButtonText}>✕ ปิด</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
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
  messagesList: { flex: 1, backgroundColor: '#F5C842' },
  messagesContainer: { 
    padding: 16,
    flexGrow: 1 // เพิ่มเพื่อให้ empty component แสดงที่กลางจอ
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
  messageContentContainer: { maxWidth: '80%', alignItems: 'flex-end' },
  senderName: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 2, marginLeft: 4 },
  
  messageBubble: {
    maxWidth: '85%', // เพิ่มความกว้างสำหรับข้อความยาว
    padding: 12, 
    borderRadius: 12, 
    backgroundColor: '#fff', 
    flexShrink: 0, // ไม่ให้กล่องข้อความหดเล็กลง
    alignSelf: 'flex-start' // ให้กล่องปรับขนาดตามเนื้อหา
  },
  myMessageBubble: { backgroundColor: '#fff', borderBottomRightRadius: 12 },
  otherMessageBubble: {
    backgroundColor: '#fff', borderBottomLeftRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
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

  inputContainer: { padding: 16, paddingTop: 8, backgroundColor: '#F5C842', borderTopWidth: 0 },
  messageInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff',
    borderRadius: 25, paddingHorizontal: 4, paddingVertical: 4
  },
  plusButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFA500',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  plusIcon: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  textInput: {
    flex: 1, borderWidth: 0, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 8, maxHeight: 100, fontSize: 16, backgroundColor: 'transparent'
  },
  sendTextButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFA500' },
  sendTextLabel: { fontSize: 16, color: '#fff', fontWeight: '500' },

  attachmentMenu: {
    position: 'absolute', bottom: 70, left: 20, backgroundColor: '#fff', borderRadius: 12, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, zIndex: 1000
  },
  attachmentMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, minWidth: 120 },
  attachmentMenuIcon: { fontSize: 18, marginRight: 12 },
  attachmentMenuText: { fontSize: 16, color: '#333' },

  selectedFileContainer: { paddingHorizontal: 15, paddingTop: 10 },
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
    backgroundColor: '#FFA500',
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
});

export default GroupChatScreen;
