import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import api, { API_URL, deleteMessage } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
// Removed InlineLoadingScreen import - no longer using loading screens
// Removed useProgressLoading hook - no longer using loading functionality
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const PrivateChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, leaveChatroom } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  // Removed loading hooks - no longer using loading functionality
  
  // เพิ่ม local loading state เป็น fallback
  const [localIsLoading, setLocalIsLoading] = useState(true);
  // const [isScrollingToEnd, setIsScrollingToEnd] = useState(false); // ปิดการใช้งาน scroll loading
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false); // Track ว่า scroll ไปข้อความล่าสุดแล้วหรือยัง
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [scrollToBottomOnLoad, setScrollToBottomOnLoad] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeForMessages, setShowTimeForMessages] = useState(new Set()); // เก็บ ID ของข้อความที่จะแสดงเวลา
  const [timeAnimations, setTimeAnimations] = useState({}); // เก็บ Animated.Value สำหรับแต่ละข้อความ
  const flatListRef = React.useRef(null); // เพิ่ม ref สำหรับ FlatList

  // ข้อมูลแชทจาก route params
  const { 
    chatroomId, 
    roomName, 
    recipientId, 
    recipientName, 
    recipientAvatar,
    showInitialLoading = false,
    fromSearch = false
  } = route.params || {};

  // Debug useEffect for selectionMode
  useEffect(() => {
    console.log('👀 selectionMode changed:', { selectionMode, selectedCount: selectedMessages.length });
  }, [selectionMode, selectedMessages]);

  // Removed initial loading state - no longer using loading functionality

  // ตรวจสอบ chatroomId ตั้งแต่ต้น
  useEffect(() => {
    if (!chatroomId) {
      console.error('❌ No chatroomId provided in route params');
      setLocalIsLoading(false);
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลห้องแชท', [
        { text: 'ตกลง', onPress: () => navigation.goBack() }
      ]);
      return;
    }
  }, [chatroomId, navigation]);

  useEffect(() => {
    // Removed loading initialization - directly load user
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && chatroomId) {
      console.log('🔄 User and chatroom ready, loading messages');
      // Reset scroll flags เมื่อเข้าแชทใหม่
      setHasScrolledToEnd(false);
      loadMessages();
    } else if (currentUser && !chatroomId) {
      console.log('🔄 User loaded but no chatroom');
      // หากโหลด user เสร็จแล้วแต่ไม่มี chatroomId
      setLocalIsLoading(false);
    }
  }, [currentUser, chatroomId]);

  // ตั้งค่า header
  useEffect(() => {
    console.log('🔧 Setting up header');
    navigation.setOptions({
      headerTitle: recipientName || roomName || 'แชท',
      headerRight: null // ใช้ปุ่มใน body แทน
    });
  }, [navigation, recipientName, roomName]);

  // Removed force stop loading timeout - no longer using loading functionality

  // Auto-scroll ไปข้อความล่าสุดเมื่อเข้าแชทครั้งแรก
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToEnd && !isLoadingMore) {
      console.log('📍 Auto-scrolling to latest message on first load:', messages.length);
      
      // ใช้ timeout เพื่อให้ FlatList render เสร็จก่อน
      const scrollTimeoutId = setTimeout(() => {
        try {
          if (messages.length > 0 && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
            setHasScrolledToEnd(true);
            console.log('✅ Scrolled to latest message');
          }
        } catch (error) {
          console.log('⚠️ Initial scroll failed:', error);
        }
      }, Platform.OS === 'ios' ? 300 : 200);
      
      return () => clearTimeout(scrollTimeoutId);
    }
  }, [messages.length, hasScrolledToEnd, isLoadingMore]);

  // Removed force stop loading when messages loaded - no longer using loading functionality

  // Socket.IO listeners
  useEffect(() => {
    if (socket && chatroomId && currentUser) { // เพิ่ม currentUser เป็นเงื่อนไข
      console.log('🔌 Setting up socket listeners for private chat:', chatroomId);
      console.log('👤 Current user loaded:', currentUser._id);
      console.log('🔌 Socket connected:', socket.connected);
      console.log('🔌 Socket ID:', socket.id);
      
      // Removed progress update - no longer using loading functionality
      
      // เข้าร่วมห้องแชท
      joinChatroom(chatroomId);

      // ฟังข้อความใหม่
      const handleNewMessage = (data) => {
        console.log('💬 PrivateChatScreen - New message received:', data);
        console.log('🔍 Checking sender ID:', data.message?.sender?._id);
        console.log('🔍 Current user ID:', currentUser?._id);
        console.log('🔍 Chatroom ID from message:', data.chatroomId);
        console.log('🔍 Current chatroom ID:', chatroomId);
        
        // ตรวจสอบว่าข้อความมาจากห้องแชทนี้
        if (data.chatroomId !== chatroomId) {
          console.log('❌ Message not for this chatroom, skipping...');
          return;
        }
        
        // ไม่รับข้อความจากตัวเองผ่าน socket (เพราะเราได้จาก API response แล้ว)
        if (data.message && data.message.sender && data.message.sender._id !== currentUser?._id) {
          console.log('✅ Message is from other user, processing...');
          // ตรวจสอบว่าข้อความนี้มีอยู่แล้วหรือไม่
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => 
              msg._id === data.message._id
            );
            
            if (messageExists) {
              console.log('🔄 Message already exists, skipping...');
              return prevMessages;
            }
            
            console.log('✅ Adding new message to chat');
            const newMessages = [...prevMessages, {
              _id: data.message._id,
              content: data.message.content,
              sender: data.message.sender,
              timestamp: data.message.timestamp,
              file: data.message.file,
              user_id: data.message.sender // ความเข้ากันได้
            }];
            
            // Scroll ไปข้อความใหม่หลังจากอัพเดท state
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            
            return newMessages;
          });
          
          // มาร์คข้อความว่าอ่านแล้วเมื่อผู้ใช้อยู่ในหน้าแชท
          if (chatroomId) {
            api.put(`/chats/${chatroomId}/read`).then(() => {
              // ส่ง socket event เพื่อแจ้งว่าได้อ่านข้อความแล้ว
              if (socket) {
                console.log('📖 Emitting messageRead event after new message received');
                socket.emit('messageRead', {
                  chatroomId: chatroomId,
                  userId: currentUser._id
                });
              }
            }).catch(err => {
              console.log('Error marking message as read:', err);
            });
          }
        } else {
          console.log('❌ Message is from current user, skipping socket event');
        }
      };

      const handleMessageDeleted = (data) => {
        console.log('🗑️ Message deleted:', data);
        
        if (data.chatroomId === chatroomId) {
          setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        }
      };

      const handleMessageEdited = (data) => {
        console.log('✏️ Message edited:', data);
        
        if (data.chatroomId === chatroomId) {
          setMessages(prev => prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, content: data.content, editedAt: data.editedAt }
              : msg
          ));
        }
      };

      // ฟังการอัปเดตสถานะการอ่านข้อความ
      const handleMessageRead = (data) => {
        console.log('👁️ PrivateChatScreen - Message read update received:', data);
        console.log('👁️ Chatroom ID from event:', data.chatroomId, 'Current chatroom:', chatroomId);
        console.log('👁️ Read by user ID:', data.readBy, 'Current user:', currentUser._id);
        
        if (data.chatroomId === chatroomId) {
          console.log('✅ Updating messages read status in PrivateChatScreen');
          setMessages(prevMessages => {
            const updatedMessages = prevMessages.map(msg => {
              // อัปเดตข้อความที่ส่งโดยผู้ใช้ปัจจุบัน (ข้อความของเรา) ให้เป็น isRead: true 
              // เมื่อมีคนอื่นอ่านข้อความ (data.readBy ไม่ใช่เรา)
              if (msg.sender._id === currentUser._id && data.readBy !== currentUser._id) {
                console.log('📖 Marking MY message as read by recipient:', msg._id);
                return { ...msg, isRead: true };
              }
              return msg;
            });
            console.log('📖 Total messages updated for read status:', updatedMessages.length);
            return updatedMessages;
          });
        } else {
          console.log('❌ Message read event not for this chatroom');
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);
      socket.on('message_edited', handleMessageEdited);
      socket.on('messageRead', handleMessageRead); // เพิ่ม listener สำหรับ message read

      // Cleanup
      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
        socket.off('message_edited', handleMessageEdited);
        socket.off('messageRead', handleMessageRead); // เพิ่ม cleanup สำหรับ messageRead
        if (chatroomId) {
          leaveChatroom(chatroomId);
        }
      };
    }
  }, [socket, chatroomId, currentUser]); // เพิ่ม currentUser dependency

  const loadCurrentUser = useCallback(async () => {
    try {
      console.log('PrivateChatScreen: Loading current user...');
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await api.get('/users/current');
      setCurrentUser(response.data);
      console.log('✅ User loaded successfully, messages will load next...');
    } catch (error) {
      console.error('Error loading user:', error);
      if (error.response?.status === 401) {
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    }
  }, [navigation]);

  const loadMessages = useCallback(async () => {
    let loadedMessages = [];
    try {
      // เพิ่ม timeout สำหรับการโหลดข้อความ
      const loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Message loading timeout - taking too long');
        Alert.alert('การโหลดล่าช้า', 'การโหลดข้อความใช้เวลานานกว่าปกติ');
      }, 8000);
      
      // โหลดเฉพาะ 30 ข้อความล่าสุด (ลดจาก 50)
      const response = await Promise.race([
        api.get(`/chats/${chatroomId}/messages?limit=30&page=1`),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Message loading timeout')), 10000)
        )
      ]);
      
      clearTimeout(loadingTimeout);
      loadedMessages = response.data.messages || [];
      
      if (loadedMessages.length === 0) {
        setMessages([]); // ตั้งค่าเป็น array ว่าง
        // เซ็ตสถานะ scroll ให้เสร็จสิ้น เพราะไม่มีข้อความให้ scroll
        setHasScrolledToEnd(true);
        // setIsScrollingToEnd(false);
      } else {
        loadedMessages.forEach((msg, index) => {
          const isMyMessage = msg.sender._id === currentUser?._id;
          
          // แจ้งเตือนถ้าข้อความของเราไม่มี isRead status ที่ถูกต้อง
          if (isMyMessage && msg.isRead === undefined) {
            console.warn('⚠️ Message of current user missing isRead status:', msg._id);
          }
        });
        
        // ไม่ต้อง reverse เพราะ backend ส่งมาเรียงจากเก่าไปใหม่แล้ว
        setMessages(loadedMessages.map(msg => ({
          ...msg,
          // ถ้าเป็นข้อความของเราและยังไม่มี isRead status ให้ตั้งเป็น false
          isRead: msg.isRead !== undefined ? msg.isRead : false
        })));
      }
      
      // มาร์คข้อความว่าอ่านแล้ว (ใช้ timeout) - ทำเฉพาะเมื่อมีข้อความ
      if (loadedMessages.length > 0) {
        try {
          await Promise.race([
            api.put(`/chats/${chatroomId}/read`),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Read status timeout')), 5000)
            )
          ]);
          
          // ส่ง socket event เพื่อแจ้งว่าได้อ่านข้อความแล้ว
          if (socket && chatroomId) {
            socket.emit('messageRead', {
              chatroomId: chatroomId,
              userId: currentUser?._id
            });
          }
        } catch (readError) {
          console.warn('⚠️ Failed to mark messages as read:', readError.message);
        }
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
      if (error.message === 'Message loading timeout') {
        Alert.alert('การโหลดล้มเหลว', 'ไม่สามารถโหลดข้อความได้ กรุณาลองใหม่', [
          { text: 'ลองใหม่', onPress: () => loadMessages() },
          { text: 'ยกเลิก', style: 'cancel' }
        ]);
      } else {
        // สำหรับ error อื่นๆ ให้ตั้งค่า messages เป็น array ว่างเพื่อให้แสดงหน้าแชท
        setMessages([]);
      }
    } finally {
      console.log('✅ Messages loading completed');
      setLocalIsLoading(false); // หยุด local loading เป็น fallback
    }
  }, [chatroomId, currentUser, socket]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !chatroomId || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}_${currentUser._id}`;
    
    // กำหนดประเภทข้อความ
    let messageType = 'text';
    let displayContent = messageToSend;
    
    if (selectedFile) {
      messageType = 'file';
      displayContent = displayContent || 'ไฟล์แนบ';
    }
    
    // Optimistic UI - เพิ่มข้อความทันทีก่อนส่งไปเซิร์ฟเวอร์
    const optimisticMessage = {
      _id: tempId,
      content: displayContent,
      sender: currentUser,
      timestamp: new Date().toISOString(),
      messageType: messageType,
      file: selectedFile ? {
        file_name: selectedFile.name || selectedFile.fileName,
        url: selectedFile.uri,
        size: selectedFile.size || selectedFile.fileSize
      } : null,

      user_id: currentUser,
      isOptimistic: true // ใช้เพื่อระบุว่าเป็นข้อความชั่วคราว
    };
    
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      // Scroll ไปข้อความใหม่
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return newMessages;
    });
    
    setNewMessage('');
    const fileToSend = selectedFile;
    setSelectedFile(null);

    try {
      const formData = new FormData();
      
      // ส่งข้อความ หรือ default text สำหรับไฟล์
      const contentToSend = messageToSend || (fileToSend ? 'ไฟล์แนบ' : '');
      formData.append('content', contentToSend);
      
      if (fileToSend) {
        console.log('� Sending file:', fileToSend);
        // ใช้ชื่อไฟล์จริงจาก file picker
        const originalFileName = fileToSend.name || fileToSend.fileName || 'unknown_file';
        console.log('📎 Original file name:', originalFileName);
        
        formData.append('file', {
          uri: fileToSend.uri,
          type: fileToSend.mimeType || 'application/octet-stream',
          name: originalFileName
        });
      }

      const response = await api.post(`/chats/${chatroomId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // แทนที่ข้อความชั่วคราวด้วยข้อความจริงจากเซิร์ฟเวอร์
      console.log('📥 Server response:', response.data);
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        
        // ตรวจสอบว่ามีข้อความนี้อยู่แล้วหรือไม่ (ป้องกันจาก socket)
        const messageExists = filteredMessages.some(msg => msg._id === response.data._id);
        if (messageExists) {
          console.log('🔄 Server message already exists from socket, skipping...');
          return filteredMessages;
        }
        
        const serverMessage = { ...response.data, isOptimistic: false };
        console.log('💾 Adding server message:', serverMessage);
        const updatedMessages = [...filteredMessages, serverMessage];
        // Scroll อีกครั้งเมื่อได้ response จริง
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return updatedMessages;
      });
      
      console.log('✅ Message sent successfully:', response.data._id);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // ลบข้อความชั่วคราวถ้าส่งไม่สำเร็จ
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setNewMessage(messageToSend); // คืนข้อความ
      setSelectedFile(fileToSend); // คืนไฟล์

      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSending(false);
    }
  };

  const pickFile = async () => {
    try {
      // ปิดเมนู
      setShowAttachmentMenu(false);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('📎 File picker result:', result);

      if (!result.cancelled && result.assets && result.assets.length > 0) {
        // เวอร์ชันใหม่ของ DocumentPicker
        setSelectedFile(result.assets[0]);
      } else if (result.type === 'success') {
        // เวอร์ชันเก่า
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const pickImage = async () => {
    try {
      // ปิดเมนู
      setShowAttachmentMenu(false);
      
      // ขอ permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // ปิด editing เพื่อให้เลือกได้ทันที
        quality: 0.8,
        allowsMultipleSelection: false, // ยังเลือกได้ทีละรูป
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // ส่งรูปภาพทันทีโดยไม่ต้องแสดงตัวอย่าง
        await sendImageDirectly(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  // ฟังก์ชันส่งรูปภาพทันที
  const sendImageDirectly = async (imageAsset) => {
    if (!chatroomId || isSending) return;
    
    try {
      setIsSending(true);
      const tempId = `temp_${Date.now()}_${Math.random()}_${currentUser._id}`;
      
      // Optimistic UI - เพิ่มข้อความทันทีก่อนส่งไปเซิร์ฟเวอร์
      const optimisticMessage = {
        _id: tempId,
        content: 'รูปภาพ',
        sender: currentUser,
        timestamp: new Date().toISOString(),
        messageType: 'image',
        image: {
          uri: imageAsset.uri,
          file_path: imageAsset.uri
        },
        user_id: currentUser,
        isOptimistic: true,
        isRead: false
      };

      // เพิ่มข้อความลงใน UI ทันที
      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return newMessages;
      });
      
      const formData = new FormData();
      formData.append('content', 'รูปภาพ');
      
      formData.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || 'image/jpeg',
        name: imageAsset.fileName || 'image.jpg',
      });

      const response = await api.post(`/chats/${chatroomId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // แทนที่ข้อความชั่วคราวด้วยข้อความจริงจากเซิร์ฟเวอร์
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        
        // ตรวจสอบว่ามีข้อความนี้อยู่แล้วหรือไม่
        const messageExists = filteredMessages.some(msg => msg._id === response.data._id);
        if (messageExists) {
          return filteredMessages;
        }
        
        const serverMessage = { ...response.data, isOptimistic: false };
        const updatedMessages = [...filteredMessages, serverMessage];
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        return updatedMessages;
      });

      console.log('✅ Image sent successfully');
    } catch (error) {
      console.error('Error sending image:', error);
      
      // ลบข้อความชั่วคราวถ้าส่งไม่สำเร็จ
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งรูปภาพได้');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
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
    if (bytes === 0) return '0 Bytes';
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

  // ฟังก์ชันเปิดรูปภาพในโหมดเต็มจอ
  const openImageModal = (imageUri) => {
    setSelectedModalImage(imageUri);
    setImageModalVisible(true);
  };

  // ฟังก์ชันดาวน์โหลดรูปภาพจาก modal
  const downloadImageFromModal = async () => {
    if (!selectedModalImage) return;
    
    try {
      // ขอ permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ข้อผิดพลาด', 'ต้องการสิทธิ์ในการเข้าถึงไฟล์เพื่อบันทึกรูปภาพ');
        return;
      }
      
      Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
      
      const fileName = `image_${Date.now()}.jpg`;
      
      console.log('📥 Starting image download:', selectedModalImage);
      
      // ดาวน์โหลดไฟล์ชั่วคราว
      const tempUri = `${FileSystem.documentDirectory}temp_${fileName}`;
      const downloadResult = await FileSystem.downloadAsync(
        selectedModalImage,
        tempUri
      );
      
      console.log('✅ Image download completed:', downloadResult.uri);
      
      if (downloadResult.status === 200) {
        // บันทึกไปที่ MediaLibrary (Gallery/Photos)
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        
        // ลบไฟล์ชั่วคราว
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        
        Alert.alert(
          'บันทึกสำเร็จ!',
          `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${fileName}`
        );
        
        console.log('✅ Image saved to gallery:', asset);
      } else {
        throw new Error(`HTTP ${downloadResult.status}`);
      }
      
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดรูปภาพได้');
    }
  };

  const downloadFile = async (file) => {
    try {
      console.log('📥 Starting download:', file);
      
      // ตรวจสอบ URL ให้ถูกต้อง
      let fileUrl;
      if (file.url && file.url.startsWith('http')) {
        fileUrl = file.url; // ใช้ URL เต็มจาก Cloudinary
      } else {
        fileUrl = `${API_URL}${file.url || file.file_path}`; // สร้าง URL จาก API_URL
      }
      
      const fileName = file.file_name || 'downloaded_file';
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      
      console.log('� File info:', { fileName, fileExtension, fileUrl });
      
      // ตรวจสอบประเภทไฟล์
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp'].includes(fileExtension);
      const isMedia = isImage || isVideo;
      
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
          const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${fileName}`;
          
          const downloadResult = await FileSystem.downloadAsync(fileUrl, tempUri);
          
          if (downloadResult.status === 200) {
            // บันทึกไปที่ MediaLibrary (Gallery/Photos)
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            
            // ลบไฟล์ชั่วคราว
            await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
            
            Alert.alert(
              'บันทึกสำเร็จ!',
              isImage ? 
                `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${fileName}` : 
                `วิดีโอถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${fileName}`
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
            const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${fileName}`;
            
            const downloadResult = await FileSystem.downloadAsync(fileUrl, tempUri);
            
            if (downloadResult.status === 200) {
              // ใช้ Sharing API เพื่อให้ผู้ใช้เลือกที่เก็บ
              const isAvailable = await Sharing.isAvailableAsync();
              
              if (isAvailable) {
                await Sharing.shareAsync(downloadResult.uri, {
                  mimeType: file.mimeType || 'application/octet-stream',
                  dialogTitle: `บันทึกไฟล์: ${fileName}`
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
            
            // สร้างชื่อไฟล์ที่ไม่ซ้ำ
            const timestamp = new Date().getTime();
            const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const finalFileName = `${cleanFileName.split('.')[0]}_${timestamp}.${fileExtension}`;
            
            const downloadResult = await FileSystem.downloadAsync(
              fileUrl,
              `${downloadDir}${finalFileName}`
            );
            
            if (downloadResult.status === 200) {
              Alert.alert(
                'ดาวน์โหลดสำเร็จ!',
                `ไฟล์ถูกบันทึกไปที่ Downloads folder แล้ว\nชื่อไฟล์: ${finalFileName}\n\nคุณสามารถหาไฟล์ได้ใน File Manager > Downloads`,
                [{ text: 'ตกลง', style: 'default' }]
              );
              
              console.log('✅ File saved to Downloads:', downloadResult.uri);
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
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // ฟังก์ชันแสดงตัวอย่างไฟล์
  const previewFile = async (file) => {
    try {
      // ตรวจสอบ URL ให้ถูกต้อง
      let fileUrl;
      if (file.url && file.url.startsWith('http')) {
        fileUrl = file.url; // ใช้ URL เต็มจาก Cloudinary
      } else {
        fileUrl = `${API_URL}${file.url || file.file_path}`; // สร้าง URL จาก API_URL
      }
      
      // ตรวจสอบประเภทไฟล์
      const fileName = file.file_name || '';
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
      const isPDF = /\.pdf$/i.test(fileName);
      
      console.log('👁️ Previewing file:', fileUrl, 'Type:', { isImage, isPDF });
      
      if (isImage) {
        // ถ้าเป็นรูป ให้เปิดใน modal แทน
        openImageModal(fileUrl);
      } else if (isPDF) {
        // สำหรับ PDF ให้ลองเปิดใน browser
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          await Linking.openURL(fileUrl);
        } else {
          Alert.alert(
            'ไม่สามารถเปิดไฟล์ได้',
            'กรุณาดาวน์โหลดไฟล์เพื่อดูเนื้อหา',
            [
              { text: 'ยกเลิก', style: 'cancel' },
              { text: 'ดาวน์โหลด', onPress: () => downloadFile(file) }
            ]
          );
        }
      } else {
        // ไฟล์ประเภทอื่นๆ ให้ดาวน์โหลด
        Alert.alert(
          'ไฟล์ประเภทนี้',
          'ไม่สามารถดูตัวอย่างได้ กรุณาดาวน์โหลดเพื่อเปิดไฟล์',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'ดาวน์โหลด', onPress: () => downloadFile(file) }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error previewing file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดูตัวอย่างไฟล์ได้');
    }
  };

  // ฟังก์ชันแสดงตัวเลือกสำหรับไฟล์
  const showFileOptions = (file) => {
    Alert.alert(
      'ตัวเลือกไฟล์',
      `จัดการไฟล์: ${file.file_name || 'ไฟล์'}`,
      [
        {
          text: 'ดูตัวอย่าง',
          onPress: () => previewFile(file)
        },
        {
          text: 'ดาวน์โหลด',
          onPress: () => downloadFile(file)
        },
        {
          text: 'ยกเลิก',
          style: 'cancel'
        }
      ]
    );
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      // Optimistic UI - ลบข้อความออกจาก state ทันที
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      // ส่งคำสั่งลบไปยัง Backend ด้วย API function
      await deleteMessage(messageId);
      
      // ส่ง socket event เพื่อแจ้งผู้อื่นว่าข้อความถูกลบ
      if (socket) {
        socket.emit('message_deleted', {
          chatroomId,
          messageId,
          deletedBy: currentUser._id
        });
      }
      
      console.log('✅ Message deleted successfully:', messageId);
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      
      // หาก error ให้โหลดข้อความใหม่เพื่อ restore state
      loadMessages();
      
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
    }
  };

  const editMessage = (message) => {
    setEditingMessage(message);
    setEditText(message.content);
    setShowEditModal(true);
  };

  // ฟังก์ชันจัดการการเลือกข้อความ
  const handleMessageSelect = (messageId) => {
    console.log('🔄 handleMessageSelect called:', { messageId, selectionMode, selectedMessages });
    if (!selectionMode) {
      console.log('❌ Not in selection mode');
      return;
    }
    
    setSelectedMessages(prev => {
      const newSelection = prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId];
      console.log('✅ Updated selectedMessages:', newSelection);
      return newSelection;
    });
  };

  // ฟังก์ชันลบข้อความที่เลือก (เฉพาะในเครื่อง)
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
            // ลบข้อความเฉพาะในเครื่อง (ไม่ส่งไปเซิร์ฟเวอร์)
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

  const saveEditMessage = async () => {
    if (!editText.trim() || !editingMessage) return;

    try {
      const response = await api.put(`/chats/messages/${editingMessage._id}`, {
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

  // ฟังก์ชันโหลดข้อความเก่า (ปรับปรุงให้เร็วขึ้น)
  const loadOlderMessages = async () => {
    if (isLoadingMore || !canLoadMore || !chatroomId) return;
    
    setIsLoadingMore(true);
    
    try {
      // คำนวณหน้าถัดไปจากจำนวนข้อความปัจจุบัน
      const currentPage = Math.floor(messages.length / 30) + 1;
      
      console.log(`🔄 Loading older messages - page ${currentPage + 1}`);
      
      // เพิ่ม timeout เพื่อป้องกันการรอนาน
      const response = await Promise.race([
        api.get(`/chats/${chatroomId}/messages?limit=30&page=${currentPage + 1}`),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Load timeout')), 10000)
        )
      ]);
      
      const olderMessages = response.data.messages || [];
      
      if (olderMessages.length === 0) {
        console.log('📭 No more older messages');
        setCanLoadMore(false);
        return;
      }
      
      // เพิ่มข้อความเก่าที่ด้านบนอย่างรวดเร็ว
      setMessages(prevMessages => [
        ...olderMessages.map(msg => ({
          ...msg,
          isRead: msg.isRead !== undefined ? msg.isRead : false
        })),
        ...prevMessages
      ]);
      
      console.log(`✅ Loaded ${olderMessages.length} older messages`);
      
      // รักษาตำแหน่งการเลื่อนอย่างง่าย
      setTimeout(() => {
        if (flatListRef.current) {
          const estimatedHeight = olderMessages.length * 80;
          flatListRef.current.scrollToOffset({
            offset: estimatedHeight,
            animated: false
          });
        }
      }, 50); // ลดเวลารอ
      
      // ตัดสินใจว่าสามารถโหลดต่อได้หรือไม่
      if (olderMessages.length < 30) {
        setCanLoadMore(false);
      }
      
    } catch (error) {
      console.error('❌ Error loading older messages:', error);
      if (error.message === 'Load timeout') {
        Alert.alert('การโหลดช้า', 'การโหลดข้อความใช้เวลานานกว่าปกติ กรุณาลองใหม่');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความเก่าได้');
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMessageDoublePress = (message) => {
    const isMyMessage = message.sender?._id === currentUser._id;
    if (isMyMessage && message.content && message.content !== 'รูปภาพ' && message.content !== 'ไฟล์แนบ') {
      editMessage(message);
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

  const renderMessage = useCallback(({ item, index }) => {
    const isMyMessage = item.sender._id === currentUser._id;
    const showTime = shouldShowTime(item, index);
    
    const handleDeleteMessageConfirm = () => {
      Alert.alert(
        'ลบข้อความ',
        'คุณต้องการลบข้อความนี้หรือไม่?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { 
            text: 'ลบ', 
            style: 'destructive',
            onPress: () => handleDeleteMessage(item._id)
          }
        ]
      );
    };
    
    const handleMessagePress = () => {
      console.log('👆 handleMessagePress called:', { 
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
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
        onLongPress={isMyMessage ? handleDeleteMessageConfirm : null}
        onPress={() => {
          console.log('🚀 TouchableOpacity onPress fired!');
          handleMessagePress();
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {/* Checkbox สำหรับ Selection Mode - แสดงเฉพาะข้อความที่ถูกเลือก */}
        {selectionMode && selectedMessages.includes(item._id) && (
          <View 
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 10,
              right: isMyMessage ? 10 : 'auto',
              left: isMyMessage ? 'auto' : 50,
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
        {!isMyMessage && (
          <View style={styles.messageAvatarContainer}>
            {recipientAvatar ? (
              <Image
                source={{ 
                  uri: recipientAvatar.startsWith('http') 
                    ? recipientAvatar 
                    : `${API_URL}/${recipientAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
                }}
                style={styles.messageAvatar}
                defaultSource={require('../../assets/default-avatar.jpg')}
              />
            ) : (
              <View style={[styles.messageAvatar, styles.defaultMessageAvatar]}>
                <Text style={styles.messageAvatarText}>
                  {recipientName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageContentContainer,
          isMyMessage ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
        ]}>
          {/* แสดงรูปภาพในกรอบแยก */}
          {(item.image || (item.file && item.file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name))) && (
            <View>
              <View style={[
                styles.imageMessageBubble,
                isMyMessage ? styles.myImageBubble : styles.otherImageBubble,
                item.isOptimistic && styles.optimisticMessage,
                selectedMessages.includes(item._id) && styles.selectedMessage
              ]}>
                <TouchableOpacity 
                  style={styles.imageContainer}
                  onPress={() => {
                    if (selectionMode) {
                      // ในโหมดเลือก ให้เลือกข้อความแทนการเปิดรูป
                      handleMessageSelect(item._id);
                    } else {
                      // โหมดปกติ เปิดรูปภาพ
                      const imageUri = item.image?.file_path || 
                                      item.image?.uri ||
                                      (item.file && item.file.url && item.file.url.startsWith('http') ? 
                                        item.file.url : 
                                        (item.file ? `${API_URL}${item.file.url || item.file.file_path}` : ''));
                      openImageModal(imageUri);
                    }
                  }}
                >
                  <Image
                    source={{ 
                      uri: item.image?.file_path || 
                           item.image?.uri ||
                           (item.file && item.file.url && item.file.url.startsWith('http') ? 
                             item.file.url : 
                             (item.file ? `${API_URL}${item.file.url || item.file.file_path}` : ''))
                    }}
                    style={styles.messageImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('❌ Error loading image:', error.nativeEvent.error);
                      console.log('🔍 Image data:', {
                        file_path: item.image?.file_path,
                        uri: item.image?.uri,
                        file_url: item.file?.url,
                        file_path_alt: item.file?.file_path
                      });
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully');
                    }}
                  />

                </TouchableOpacity>
              </View>
              
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
                  <View style={styles.timeAndStatusRow}>
                    <Text style={[
                      styles.messageTimeBottom,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
                    ]}>
                      {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                    {isMyMessage && !item.isOptimistic && (
                      <View style={styles.readStatusContainer}>
                        <Text style={[
                          styles.readStatusIcon,
                          item.isRead ? styles.readStatusIconRead : styles.readStatusIconSent
                        ]}>
                          {item.isRead ? '✓✓' : '✓'}
                        </Text>
                        <Text style={[
                          styles.readStatusBottom,
                          isMyMessage ? styles.myReadStatusBottom : styles.otherReadStatusBottom
                        ]}>
                          {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                        </Text>
                        {/* Debug: แสดงสถานะ isRead สำหรับรูปภาพ */}
                        {__DEV__ && (
                          <Text style={{fontSize: 8, color: 'gray', marginLeft: 5}}>
                            [IMG:{String(item.isRead)}]
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}
            </View>
          )}

          {/* แสดงข้อความในกรอบแยก (ถ้ามีข้อความและไม่ใช่ default) */}
          {item.content && item.content !== 'รูปภาพ' && item.content !== 'ไฟล์แนบ' && (
            <View>
              <View style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                item.isOptimistic && styles.optimisticMessage,
                (item.image || (item.file && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name))) && styles.messageWithMedia,
                selectedMessages.includes(item._id) && styles.selectedMessage
              ]}>
                <Text style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                  item.isOptimistic && styles.optimisticMessageText
                ]}>
                  {item.content && item.content.trim() !== '' ? item.content : 'ข้อความ'}
                </Text>
                {item.editedAt && (
                  <Text style={[styles.editedText, isMyMessage ? styles.myEditedText : styles.otherEditedText]}>
                    แก้ไขแล้ว
                  </Text>
                )}
              </View>
              
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
                  <View style={styles.timeAndStatusRow}>
                    <Text style={[
                      styles.messageTimeBottom,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
                    ]}>
                      {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                    {isMyMessage && !item.isOptimistic && (
                      <View style={styles.readStatusContainer}>
                        <Text style={[
                          styles.readStatusIcon,
                          item.isRead ? styles.readStatusIconRead : styles.readStatusIconSent
                        ]}>
                          {item.isRead ? '✓✓' : '✓'}
                        </Text>
                        <Text style={[
                          styles.readStatusBottom,
                          isMyMessage ? styles.myReadStatusBottom : styles.otherReadStatusBottom
                        ]}>
                          {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}
            </View>
          )}

          {/* แสดงไฟล์ถ้ามี (ที่ไม่ใช่รูปภาพ) - แบบไม่มีกรอบ */}
          {item.file && !(item.file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name)) && (
            <View>
              <View style={[
                styles.fileMessageBubble,
                isMyMessage ? styles.myFileBubble : styles.otherFileBubble,
                item.isOptimistic && styles.optimisticMessage,
                selectedMessages.includes(item._id) && styles.selectedMessage
              ]}>
                <View style={styles.fileAttachmentContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.fileAttachment,
                      isMyMessage ? styles.myFileAttachment : styles.otherFileAttachment
                    ]}
                    onPress={() => {
                      if (selectionMode) {
                        // ในโหมดเลือก ให้เลือกข้อความแทนการเปิดไฟล์
                        handleMessageSelect(item._id);
                      } else {
                        // โหมดปกติ เปิดตัวเลือกไฟล์
                        showFileOptions(item.file);
                      }
                    }}
                  >
                    <View style={styles.fileIcon}>
                      {getFileIcon(decodeFileName(item.file.file_name))}
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={[
                        styles.fileName,
                        { color: isMyMessage ? "#fff" : "#333" }
                      ]} numberOfLines={2}>
                        {decodeFileName(item.file.file_name)}
                      </Text>
                      <Text style={[
                        styles.fileSize,
                        { color: isMyMessage ? "rgba(255,255,255,0.8)" : "#666" }
                      ]}>
                        {item.file.size ? formatFileSize(item.file.size) : 'ขนาดไม่ทราบ'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                </View>
              </View>
              
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
                  <View style={styles.timeAndStatusRow}>
                    <Text style={[
                      styles.messageTimeBottom,
                      isMyMessage ? styles.myMessageTimeBottom : styles.otherMessageTimeBottom
                    ]}>
                      {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                    </Text>
                    {isMyMessage && !item.isOptimistic && (
                      <View style={styles.readStatusContainer}>
                        <Text style={[
                          styles.readStatusIcon,
                          item.isRead ? styles.readStatusIconRead : styles.readStatusIconSent
                        ]}>
                          {item.isRead ? '✓✓' : '✓'}
                        </Text>
                        <Text style={[
                          styles.readStatusBottom,
                          isMyMessage ? styles.myReadStatusBottom : styles.otherReadStatusBottom
                        ]}>
                          {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [currentUser, recipientAvatar, recipientName, messages, showTimeForMessages, timeAnimations, selectionMode, selectedMessages]);

  // ฟังก์ชันแสดงรายการข้อความ - ลบ loading ออกแล้ว
  const renderMessageLoadingContent = () => {
    // แสดง FlatList ทันทีโดยไม่มี loading
    return (
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item._id}_${index}`}
        renderItem={renderMessage}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (scrollToBottomOnLoad && messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
              setScrollToBottomOnLoad(false);
            }, 100);
          }
        }}
        ListHeaderComponent={() =>
          canLoadMore && messages.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadOlderMessages}
                disabled={isLoadingMore}
              >
                <Text style={styles.loadMoreText}>
                  {isLoadingMore ? 'กำลังโหลด...' : 'โหลดข้อความเก่า'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyMessageContainer}>
            <Text style={styles.emptyMessageText}>
              ยังไม่มีข้อความในแชทนี้
            </Text>
            <Text style={styles.emptyMessageSubText}>
              เริ่มต้นการสนทนาได้เลย!
            </Text>
          </View>
        )}
      />
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
      {/* Loading overlay สำหรับการ scroll - ปิดการใช้งาน */}
      {/* {isScrollingToEnd && (
        <View style={styles.scrollLoadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.scrollLoadingText}>กำลังไปที่ข้อความล่าสุด...</Text>
        </View>
      )} */}
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
            chatId: route.params?.returnChatId || route.params?.chatroomId 
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
        
        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          {recipientAvatar ? (
            <Image
              source={{ 
                uri: recipientAvatar.startsWith('http') 
                  ? recipientAvatar 
                  : `${API_URL}/${recipientAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 12
              }}
              defaultSource={require('../../assets/default-avatar.jpg')}
            />
          ) : (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12,
              backgroundColor: '#e5e7eb',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#6b7280'
              }}>
                {recipientName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#000000'
            }}>
              {recipientName || roomName || 'แชทส่วนตัว'}
            </Text>
            <Text style={{
              fontSize: 12,
              color: '#10b981'
            }}>ออนไลน์</Text>
          </View>
        </View>
        
        {/* ปุ่มขวาบน */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {selectionMode ? (
            <>
              {/* ปุ่มยกเลิก - ซ้าย */}
              <TouchableOpacity
                onPress={() => {
                  console.log('� Cancel selection mode');
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
            <TouchableOpacity
              onPress={() => {
                console.log('🔄 Turning ON selection mode - BEFORE:', { selectionMode });
                setSelectionMode(true);
                console.log('🔄 Turning ON selection mode - AFTER set to true');
              }}
              style={{ 
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#007AFF',
                borderRadius: 8,
                minWidth: 50,
                minHeight: 40
              }}
            >
              <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                เมนู
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Debug Banner - Always Show */}
      <View style={{
        backgroundColor: selectionMode ? '#FF3B30' : '#6B7280',
        paddingVertical: 4,
        paddingHorizontal: 16,
        alignItems: 'center'
      }}>
        <Text style={{
          color: 'white',
          fontSize: 12,
          fontWeight: 'bold'
        }}>
          DEBUG: {selectionMode ? 'โหมดเลือกข้อความ' : 'โหมดปกติ'} - เลือกแล้ว: {selectedMessages.length}
        </Text>
      </View>

      {/* Selection Mode Banner */}
      {selectionMode && (
        <View style={{
          backgroundColor: '#FF3B30',
          paddingVertical: 8,
          paddingHorizontal: 16,
          alignItems: 'center'
        }}>
          <Text style={{
            color: 'white',
            fontSize: 14,
            fontWeight: 'bold'
          }}>
            โหมดเลือกข้อความ - กดที่ข้อความเพื่อเลือก ({selectedMessages.length} เลือกแล้ว)
          </Text>
        </View>
      )}

      {/* รายการข้อความ */}
      <View 
        style={{
          flex: 1,
          backgroundColor: '#ffffff'
        }}
        onTouchStart={() => setShowAttachmentMenu(false)}
        pointerEvents="auto"
      >
        {/* แสดง loading หรือรายการข้อความ */}
        {renderMessageLoadingContent()}
      </View>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && !selectionMode && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            setShowScrollToBottom(false);
          }}
        >
          <Text style={styles.scrollToBottomIcon}>↓</Text>
        </TouchableOpacity>
      )}



      {/* Input สำหรับพิมพ์ข้อความ */}
      <View style={styles.inputContainer}>
        {/* แสดงไฟล์/รูปภาพที่เลือก แบบ Telegram */}
        {selectedFile && (
          <View style={{
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            margin: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: '#3b82f6',
            ...SHADOWS.small
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <>
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 8,
                      backgroundColor: '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12
                    }}>
                      {getFileIcon(selectedFile.name || selectedFile.fileName)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: 2
                      }}>
                        � ไฟล์แนบ
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#64748b'
                      }} numberOfLines={1}>
                        {selectedFile.name || selectedFile.fileName || 'ไฟล์ที่เลือก'} • {selectedFile.size ? Math.round(selectedFile.size / 1024) + ' KB' : ''}
                      </Text>
                    </View>
                  </>

              </View>
            </View>
          </View>
        )}
        
        {/* Attachment Menu - Vertical Style */}
        {showAttachmentMenu && (
          <View style={styles.verticalAttachmentMenu}>
            
            <TouchableOpacity
              style={styles.verticalAttachmentItem}
              onPress={() => {
                pickImage();
                setShowAttachmentMenu(false);
              }}
            >
              <Text style={{ fontSize: 16, color: "#10b981", fontWeight: 'bold' }}>IMG</Text>
              <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.verticalAttachmentItem}
              onPress={() => {
                pickFile();
                setShowAttachmentMenu(false);
              }}
            >
              <Text style={{ fontSize: 16, color: "#3b82f6", fontWeight: 'bold' }}>FILE</Text>
              <Text style={styles.attachmentMenuText}>ไฟล์</Text>
            </TouchableOpacity>
          </View>
        )}        <View style={styles.messageInputRow}>
          <TouchableOpacity
            style={styles.leftAttachmentButton}
            onPress={() => {
              console.log('📎 Plus button pressed');
              setShowAttachmentMenu(!showAttachmentMenu);
            }}
          >
            <Text style={{ fontSize: 28, color: "#007AFF", fontWeight: 'bold' }}>+</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            keyboardType="default"
            returnKeyType="default"
            autoCorrect={true}
            spellCheck={true}
            autoCapitalize="sentences"
          />
          
          <TouchableOpacity
            style={styles.floatingSendButton}
            onPress={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || isSending}
          >
            <Text style={styles.sendButtonText}>ส่ง</Text>
          </TouchableOpacity>
        </View>
      </View>

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
                onPress={downloadImageFromModal}
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


    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    marginTop: SPACING.sm + 2,
    fontWeight: '600',
  },
  loadingSubText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.xs,
  },
  scrollLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  scrollLoadingText: {
    color: '#333',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: 50,
    backgroundColor: COLORS.background,
    borderBottomWidth: 0,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm
  },
  backIcon: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.accent,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm + 4
  },
  defaultAvatar: {
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerAvatarText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.textSecondary
  },
  headerTextInfo: {
    flex: 1
  },
  headerName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary
  },
  headerStatus: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success
  },
  headerActions: {
    width: 40
  },

  // Messages Styles
  messagesListContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  messagesContainer: {
    padding: SPACING.md,
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
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontWeight: '500'
  },
  emptyMessageSubText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textTertiary,
    textAlign: 'center'
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 8
  },
  myMessage: {
    justifyContent: 'flex-end'
  },
  otherMessage: {
    justifyContent: 'flex-start'
  },
  messageAvatarContainer: {
    marginRight: 8
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  defaultMessageAvatar: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280'
  },
  messageBubble: {
    maxWidth: '80%',
    minWidth: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    marginRight: 8
  },
  otherMessageBubble: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    marginLeft: 8
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400'
  },
  myMessageText: {
    color: '#ffffff'
  },
  otherMessageText: {
    color: '#1f2937'
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4
  },
  myMessageTime: {
    color: '#666',
    textAlign: 'right'
  },
  otherMessageTime: {
    color: '#666'
  },
  
  // Message Info Container (ข้างหน้ากล่องข้อความ)
  messageInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2, // ลดระยะห่างให้ชิดกับกล่องข้อความมากขึ้น
    paddingHorizontal: 4,
  },
  myMessageInfo: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  otherMessageInfo: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  
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
  timeAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Read Status Container สำหรับจัดกลุ่มไอคอนกับข้อความ
  readStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Read Status Icon Styles
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
  messageTimeBottom: {
    fontSize: 10,
    color: '#666',
    lineHeight: 12,
    textAlign: 'left', // เปลี่ยนจาก center เป็น left
    marginRight: 8, // เพิ่มระยะห่างระหว่างเวลาและ status
  },
  myMessageTimeBottom: {
    color: '#666',
  },
  otherMessageTimeBottom: {
    color: '#666',
  },
  readStatusBottom: {
    fontSize: 9,
    lineHeight: 10,
    textAlign: 'left', // เปลี่ยนจาก center เป็น left
  },
  myReadStatusBottom: {
    color: '#666',
  },
  otherReadStatusBottom: {
    color: '#666',
  },
  
  // External Time and Status (ข้างนอกกล่อง)
  messageTimeExternal: {
    fontSize: 11,
    marginRight: 6,
  },
  myMessageTimeExternal: {
    color: '#666',
    textAlign: 'right',
  },
  otherMessageTimeExternal: {
    color: '#666',
    textAlign: 'left',
  },
  readStatusExternal: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  myReadStatusExternal: {
    color: '#666',
  },
  otherReadStatusExternal: {
    color: '#666',
  },
  
  // Image Time Container
  imageTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  imageReadStatus: {
    color: '#666',
  },
  
  // File Time Container
  fileTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  fileReadStatus: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  // Optimistic message styles
  optimisticMessage: {
    opacity: 0.7
  },
  optimisticMessageText: {
    fontStyle: 'italic'
  },

  // Input Styles
  inputContainer: {
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
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileName: {
    marginLeft: SPACING.sm,
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  removeFileButton: {
    padding: SPACING.xs,
  },
  messageInputRow: {
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
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  plusIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 4,
  },
  textInput: {
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
  },
  sendTextButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  sendTextLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },

  // Attachment Menu Styles
  attachmentMenu: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 140,
    borderRadius: 12,
    marginVertical: 2
  },
  attachmentMenuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  attachmentMenuText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500'
  },

  // File attachment styles
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 200,
  },
  myFileAttachment: {
    backgroundColor: '#007AFF',
  },
  otherFileAttachment: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileIcon: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
  },

  // File Message Bubble (แบบไม่มีกรอบข้อความ)
  fileMessageBubble: {
    padding: 4,
    borderRadius: 18,
    marginBottom: 4,
  },
  myFileBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-end',
  },
  otherFileBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  
  // File message time
  fileMessageTime: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 8,
  },

  // Icons
  attachIcon: {
    fontSize: 16,
  },
  closeIcon: {
    fontSize: 16,
    color: '#666',
  },
  sendIcon: {
    fontSize: 20,
    color: '#fff',
  },
  
  // Scroll to Bottom Button
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollToBottomIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  
  // Image Styles
  selectedImageContainer: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  imagePreview: {
    flex: 1,
    marginRight: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    padding: 6,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent'
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: 'transparent'
  },
  
  // Separate Message Containers
  messageContentContainer: {
    flex: 1,
    maxWidth: '80%',
  },
  
  // Image Message Bubble
  imageMessageBubble: {
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  myImageBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-end',
  },
  otherImageBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  
  // Text message with media
  messageWithMedia: {
    marginTop: 4,
  },
  
  // Image message time
  imageMessageTime: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 8,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalDownloadButton: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  modalDownloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  
  // Delete button styles for images and files
  deleteImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteImageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileAttachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  deleteFileButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  messageLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  selectedMessage: {
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
  },
  loadMoreContainer: {
    padding: 15,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadMoreText: {
    color: '#666',
    fontSize: 14,
  },
  deleteSelectedButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteSelectedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerMenuDropdown: {
    position: 'absolute',
    top: 40,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    minWidth: 150,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerMenuText: {
    fontSize: 16,
    color: '#333',
  },
  floatingPlusButton: {
    position: 'absolute',
    right: 60,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  leftAttachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  floatingSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  verticalAttachmentMenu: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 1000,
  },
  verticalAttachmentItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 8,
    marginVertical: 2,
    minWidth: 120,
  },
  attachmentMenuText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default PrivateChatScreen;
