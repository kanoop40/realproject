import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Modal,
  Linking,
  Modal,
  Animated,
  Dimensions,
  RefreshControl
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import api, { API_URL, deleteMessage } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import ChatMessage from '../../components_user/ChatMessage';
import ChatInputBar from '../../components_user/ChatInputBar';
import ChatHeader from '../../components_user/ChatHeader';
import LoadOlderMessagesPrivateChat from '../../components_user/LoadOlderMessagesPrivateChat';
import LoadingOverlay from '../../components/LoadingOverlay';

const PrivateChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, leaveChatroom } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [scrollToBottomOnLoad, setScrollToBottomOnLoad] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showLoadOlderButton, setShowLoadOlderButton] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showChatContent, setShowChatContent] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeForMessages, setShowTimeForMessages] = useState(() => new Set());
  const showTimeForMessagesRef = useRef(new Set());
  const [timeAnimations, setTimeAnimations] = useState({});
  const [successNotification, setSuccessNotification] = useState({ visible: false, message: '' });
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const flatListRef = React.useRef(null);

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

  // Load user data
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load messages when user and chatroom are ready
  // Sync ref with state
  useEffect(() => {
    showTimeForMessagesRef.current = showTimeForMessages;
  }, [showTimeForMessages]);

  useEffect(() => {
    if (currentUser && chatroomId) {
      console.log('🚀 Loading initial 30 messages and scrolling to latest');
      loadMessages(1, false);
      setHasScrolledToEnd(false);
      setCurrentPage(1);
    }
  }, [currentUser, chatroomId]);

  // Mark messages as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser && chatroomId) {
        console.log('📖 Marking private chat as read:', chatroomId);
        
        // Mark messages as read
        const markAsRead = async () => {
          try {
            await api.put(`/chats/${chatroomId}/read`);
            console.log('✅ Marked private chat as read:', chatroomId);
          } catch (error) {
            console.error('❌ Error marking private chat as read:', error);
          }
        };

        markAsRead();
      }
    }, [currentUser, chatroomId])
  );

  // Initial load only - ไม่รีเฟรชเมื่อกลับมา
  useEffect(() => {
    if (currentUser && chatroomId) {
      console.log('� Initial load - loading messages once');
      loadMessages(1, false);
    }
  }, [currentUser, chatroomId]);

  // Smart Background Sync (ไม่รีเฟรชหน้าจอ)
  useEffect(() => {
    let backgroundSync;
    
    if (currentUser && chatroomId) {
      console.log('� Starting background sync...');
      
      backgroundSync = setInterval(async () => {
        try {
          // เช็คข้อความใหม่โดยไม่รีเฟรชทั้งหน้า
          const response = await api.get(`/chats/${chatroomId}/check-new?lastId=${messages[0]?._id}`);
          
          if (response.data.newMessages && response.data.newMessages.length > 0) {
            console.log('📨 New messages detected, adding to existing list...');
            
            // Add comprehensive safety checks to new messages too
            const safeNewMessages = response.data.newMessages
              .filter((msg, index) => {
                if (!msg.sender && !msg.sender_id && !msg.user_id) {
                  console.warn(`⚠️ Filtering out new message ${index} - no sender info:`, msg);
                  return false;
                }
                return true;
              })
              .map((msg, index) => {
                const safeSender = msg.sender ? {
                  ...msg.sender,
                  _id: msg.sender._id || null,
                  firstName: msg.sender.firstName || 'Unknown',
                  lastName: msg.sender.lastName || '',
                  username: msg.sender.username || msg.sender.firstName || 'Unknown'
                } : {
                  _id: msg.sender_id || msg.user_id || 'unknown',
                  firstName: 'Unknown User',
                  lastName: '',
                  username: 'unknown'
                };
                
                return {
                  ...msg,
                  sender: safeSender,
                  sender_id: msg.sender_id || (msg.sender?._id) || null,
                  user_id: msg.user_id || (msg.sender?._id) || null
                };
              });
            
            // เพิ่มข้อความใหม่เข้าไปโดยไม่รีเฟรช
            setMessages(prev => [...safeNewMessages, ...prev]);
            
            // Auto scroll เฉพาะถ้าผู้ใช้อยู่ล่างสุด
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        } catch (error) {
          console.log('� Background sync failed:', error.message);
        }
      }, 5000); // เช็คทุก 5 วินาที แต่ไม่รีเฟรช
    }

    return () => {
      if (backgroundSync) {
        clearInterval(backgroundSync);
      }
    };
  }, [currentUser, chatroomId, messages.length]);

  // Simple component with basic functionality
  const loadCurrentUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const response = await api.get('/users/current');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
      Alert.alert('Error', 'Failed to load user data');
      navigation.replace('Login');
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const loadMessages = useCallback(async (page = 1, refresh = false) => {
    if (!currentUser || !chatroomId) return;
    
    try {
      console.log(`📥 Loading messages page ${page}`);
      const response = await api.get(`/chats/${chatroomId}/messages?page=${page}&limit=30`);
      
      // Filter out messages with problematic data and add safety checks
      const rawMessages = response.data.messages || [];
      console.log('📨 Raw messages from API:', rawMessages.length, 'messages');
      if (rawMessages.length > 0) {
        console.log('📨 First message structure:', {
          id: rawMessages[0]._id,
          sender: rawMessages[0].sender,
          sender_id: rawMessages[0].sender_id,
          user_id: rawMessages[0].user_id,
          content: rawMessages[0].content?.substring(0, 50)
        });
      }
      
      const safeMessages = rawMessages
        .filter((msg, index) => {
          // Filter out messages that have no way to identify sender
          if (!msg.sender && !msg.sender_id && !msg.user_id) {
            console.warn(`⚠️ Filtering out message ${index} - no sender info:`, msg);
            return false;
          }
          return true;
        })
        .map((msg, index) => {
          try {
            // Ensure all sender-related fields are properly defined
            const safeSender = msg.sender ? {
              ...msg.sender,
              _id: msg.sender._id || null,
              firstName: msg.sender.firstName || 'Unknown',
              lastName: msg.sender.lastName || '',
              username: msg.sender.username || msg.sender.firstName || 'Unknown'
            } : {
              _id: msg.sender_id || msg.user_id || 'unknown',
              firstName: 'Unknown User',
              lastName: '',
              username: 'unknown'
            };
            
            const processedMsg = {
              ...msg,
              sender: safeSender, // Always provide a valid sender object
              sender_id: msg.sender_id || (msg.sender?._id) || null,
              user_id: msg.user_id || (msg.sender?._id) || null
            };
            
            // Debug log removed for performance
            
            return processedMsg;
          } catch (error) {
            console.error(`❌ Error processing message ${index}:`, error, msg);
            // Return a safe fallback message
            return {
              ...msg,
              sender: {
                _id: 'unknown',
                firstName: 'Error User',
                lastName: '',
                username: 'error'
              },
              sender_id: null,
              user_id: null
            };
          }
        });
      
      if (refresh || page === 1) {
        setMessages(safeMessages);
      } else {
        setMessages(prev => [...prev, ...safeMessages]);
      }
      
      setCanLoadMore(response.data.hasMore || false);
      setCurrentPage(page);
      
      // Auto scroll for new messages
      if (page === 1) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentUser, chatroomId]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !canLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      console.log(`📚 Loading more messages - page ${nextPage}`);
      
      const response = await api.get(`/chats/${chatroomId}/messages?limit=30&page=${nextPage}`);
      const olderMessages = response.data.messages || [];
      
      if (olderMessages.length < 30) {
        setCanLoadMore(false);
      }
      
      if (olderMessages.length > 0) {
        // Add comprehensive safety checks to older messages too
        const safeOlderMessages = olderMessages
          .filter((msg, index) => {
            if (!msg.sender && !msg.sender_id && !msg.user_id) {
              console.warn(`⚠️ Filtering out older message ${index} - no sender info:`, msg);
              return false;
            }
            return true;
          })
          .map((msg, index) => {
            const safeSender = msg.sender ? {
              ...msg.sender,
              _id: msg.sender._id || null,
              firstName: msg.sender.firstName || 'Unknown',
              lastName: msg.sender.lastName || '',
              username: msg.sender.username || msg.sender.firstName || 'Unknown'
            } : {
              _id: msg.sender_id || msg.user_id || 'unknown',
              firstName: 'Unknown User',
              lastName: '',
              username: 'unknown'
            };
            
            return {
              ...msg,
              sender: safeSender,
              sender_id: msg.sender_id || (msg.sender?._id) || null,
              user_id: msg.user_id || (msg.sender?._id) || null
            };
          });
        
        setMessages(prev => [...prev, ...safeOlderMessages]);
        setCurrentPage(nextPage);
      }
      
    } catch (error) {
      console.error('Error loading more messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความเก่าได้');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, canLoadMore, currentPage, chatroomId]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !chatroomId || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}_${currentUser._id}`;
    
    let messageType = 'text';
    let displayContent = messageToSend;
    
    if (selectedFile) {
      messageType = 'file';
      displayContent = displayContent || 'ไฟล์แนบ';
    }
    
    const optimisticMessage = {
      _id: tempId,
      content: displayContent,
      sender: currentUser,
      timestamp: new Date().toISOString(),
      messageType: messageType,
      fileName: selectedFile ? (selectedFile.name || selectedFile.fileName) : null,
      fileSize: selectedFile ? (selectedFile.size || selectedFile.fileSize) : null,
      mimeType: selectedFile ? (selectedFile.mimeType || selectedFile.type) : null,
      file: selectedFile ? {
        name: selectedFile.name || selectedFile.fileName,
        uri: selectedFile.uri,
        size: selectedFile.size || selectedFile.fileSize
      } : null,
      user_id: currentUser,
      isOptimistic: true
    };
    
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return newMessages;
    });
    
    setNewMessage('');
    const fileToSend = selectedFile;
    setSelectedFile(null);

    try {
      const contentToSend = messageToSend || (fileToSend ? 'ไฟล์แนบ' : '');
      
      let response;
      
      if (fileToSend) {
        const formData = new FormData();
        formData.append('content', contentToSend);
        formData.append('sender_id', currentUser._id);
        formData.append('file', {
          uri: fileToSend.uri,
          type: fileToSend.mimeType || fileToSend.type || 'application/octet-stream',
          name: fileToSend.name || fileToSend.fileName || 'file'
        });

        response = await api.post(`/chats/${chatroomId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post(`/chats/${chatroomId}/messages`, {
          content: contentToSend,
          sender_id: currentUser._id
        });
      }

      console.log('📥 File Server response:', response.data);
      setMessages(prev => {
        const updatedMessages = prev.map(msg => {
          if (msg._id === tempId) {
            const serverMessage = response.data.message || response.data;
            return {
              ...serverMessage,
              _id: serverMessage._id,
              content: serverMessage.content,
              sender: serverMessage.sender || currentUser,
              timestamp: serverMessage.timestamp || serverMessage.createdAt,
              messageType: serverMessage.messageType || serverMessage.type,
              fileName: serverMessage.fileName,
              fileSize: serverMessage.fileSize,
              mimeType: serverMessage.mimeType,
              file: serverMessage.file || (serverMessage.fileName ? {
                name: serverMessage.fileName,
                size: serverMessage.fileSize,
                type: serverMessage.mimeType
              } : null),
              user_id: serverMessage.user_id || serverMessage.sender,
              isOptimistic: false
            };
          }
          return msg;
        });
        return updatedMessages;
      });
      
      console.log('✅ Message sent successfully:', response.data._id);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setNewMessage(messageToSend);
      setSelectedFile(fileToSend);

      let errorMessage = 'ไม่สามารถส่งข้อความได้';
      
      if (error.response?.status === 500) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ภายหลัง';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else {
        errorMessage = `เกิดข้อผิดพลาด: ${error.message}`;
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // File picker
  const pickFile = async () => {
    try {
      setShowAttachmentMenu(false);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.cancelled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      } else if (result.type === 'success') {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  // Image picker
  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const pickImage = async () => {
    try {
      setShowAttachmentMenu(false);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await sendImageDirectly(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const sendImageDirectly = async (imageAsset) => {
    if (!chatroomId || isSending) return;
    
    setIsSending(true);
    const tempId = `temp_${Date.now()}_${Math.random()}_${currentUser._id}`;
    
    try {
      const optimisticMessage = {
        _id: tempId,
        content: 'รูปภาพ',
        sender: currentUser,
        timestamp: new Date().toISOString(),
        messageType: 'image',
        user_id: currentUser,
        isOptimistic: true
      };

      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return newMessages;
      });
      
      const fileName = imageAsset.fileName || imageAsset.filename || `image_${Date.now()}.jpg`;
      
      const fileObject = {
        uri: imageAsset.uri,
        name: fileName,
        type: 'image/jpeg'
      };
      
      const base64 = await FileSystem.readAsStringAsync(fileObject.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await api.post(`/chats/${chatroomId}/messages`, {
        content: 'รูปภาพ',
        sender_id: currentUser._id,
        messageType: 'image',
        fileName: fileName,
        fileData: base64,
        mimeType: 'image/jpeg'
      });

      setMessages(prev => {
        const updatedMessages = prev.map(msg => {
          if (msg._id === tempId) {
            const serverMessage = response.data.message || response.data;
            return {
              ...serverMessage,
              _id: serverMessage._id,
              content: serverMessage.content,
              sender: serverMessage.sender || currentUser,
              timestamp: serverMessage.timestamp || serverMessage.createdAt,
              messageType: serverMessage.messageType || 'image',
              fileName: serverMessage.fileName,
              fileSize: serverMessage.fileSize,
              mimeType: serverMessage.mimeType || 'image/jpeg',
              file: serverMessage.file || {
                name: serverMessage.fileName,
                size: serverMessage.fileSize,
                type: serverMessage.mimeType || 'image/jpeg'
              },
              user_id: serverMessage.user_id || serverMessage.sender,
              isOptimistic: false
            };
          }
          return msg;
        });        
        return updatedMessages;
      });

      console.log('✅ Image sent successfully');
    } catch (error) {
      console.error('❌ Error sending image:', error);
      
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      
      let errorMessage = 'ไม่สามารถส่งรูปภาพได้';
      
      if (error.response?.status === 500) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาเริ่มเซิร์ฟเวอร์ backend';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์ backend ทำงานอยู่';
      } else {
        errorMessage = `เกิดข้อผิดพลาด: ${error.message}`;
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // Helper functions
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    if (!fileName) {
      return '📄';
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📘';
      case 'xls':
      case 'xlsx': return '📗';
      case 'ppt':
      case 'pptx': return '📙';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov': return '🎬';
      case 'mp3':
      case 'wav': return '🎵';
      case 'zip':
      case 'rar': return '🗜️';
      default: return '📄';
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMessages(1, true);
    setIsRefreshing(false);
  }, [loadMessages]);

  // Toggle time display for message
  const toggleTimeDisplay = (messageId) => {
    if (!messageId || messageId.startsWith('date_')) return;

    setShowTimeForMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      showTimeForMessagesRef.current = newSet; // Sync ref
      return newSet;
    });
  };

  // Handle message selection
  const handleMessagePress = (messageId) => {
    if (!messageId || messageId.startsWith('date_')) return;
    
    if (selectionMode) {
      // Selection mode - ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
      const message = messages.find(msg => msg._id === messageId);
      if (!message) return;
      
      // ตรวจสอบว่าเป็นข้อความของผู้ส่งปัจจุบันหรือไม่
      const isMyMessage = (
        message.sender_id?._id === currentUser._id ||
        message.sender_id === currentUser._id ||
        (message.sender && message.sender?._id === currentUser._id) ||
        message.user_id?._id === currentUser._id ||
        message.user_id === currentUser._id
      );
      
      // ลบได้เฉพาะข้อความของตัวเอง
      if (!isMyMessage) {
        Alert.alert('ไม่สามารถเลือกได้', 'คุณสามารถลบได้เฉพาะข้อความของตัวเองเท่านั้น');
        return;
      }
      
      // เลือก/ยกเลิกการเลือกข้อความ
      setSelectedMessages(prev => {
        if (prev.includes(messageId)) {
          return prev.filter(id => id !== messageId);
        } else {
          return [...prev, messageId];
        }
      });
    } else {
      // Normal mode - toggle time display
      toggleTimeDisplay(messageId);
    }
  };

  const handleLongPress = (messageId) => {
    if (!selectionMode && messageId && !messageId.startsWith('date_')) {
      // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
      const message = messages.find(msg => msg._id === messageId);
      if (!message) return;
      
      const isMyMessage = (
        message.sender_id?._id === currentUser._id ||
        message.sender_id === currentUser._id ||
        (message.sender && message.sender?._id === currentUser._id) ||
        message.user_id?._id === currentUser._id ||
        message.user_id === currentUser._id
      );
      
      if (isMyMessage) {
        setSelectionMode(true);
        setSelectedMessages([messageId]);
      } else {
        Alert.alert('ไม่สามารถลบได้', 'คุณสามารถลบได้เฉพาะข้อความของตัวเองเท่านั้น');
      }
    }
  };

  // ยกเลิกการเลือก
  const cancelSelection = () => {
    setSelectedMessages([]);
    setSelectionMode(false);
  };

  // Delete selected messages
  const deleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;
    
    Alert.alert(
      'ลบข้อความ', 
      `คุณต้องการลบ ${selectedMessages.length} ข้อความของคุณหรือไม่?\n(ลบจากเซิร์ฟเวอร์และทุกคนจะไม่เห็นข้อความนี้)`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Starting to delete selected messages...');
              console.log('📝 Selected messages:', selectedMessages);

              const token = await AsyncStorage.getItem('token');
              
              // ลบข้อความทีละข้อ
              for (const messageId of selectedMessages) {
                try {
                  const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Failed to delete message ${messageId}: ${response.status} - ${errorData}`);
                  }
                  
                  console.log(`✅ Message ${messageId} deleted successfully`);
                } catch (messageError) {
                  console.error(`❌ Error deleting message ${messageId}:`, messageError);
                  // Continue with other messages even if one fails
                }
              }
              
              // Remove deleted messages from state
              setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg._id)));
              cancelSelection();
              
              showSuccessNotification('ลบข้อความสำเร็จ');
              console.log('✅ All selected messages processed');

            } catch (error) {
              console.error('❌ Error deleting messages:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const renderMessage = useCallback(({ item, index }) => {
    // Extra safety check before rendering
    if (!item) {
      console.warn('❌ Trying to render null/undefined item');
      return null;
    }
    
    if (!item.sender) {
      console.warn('❌ Message has no sender:', item);
      // Create a fallback sender
      item.sender = {
        _id: 'unknown',
        firstName: 'Unknown User',
        lastName: '',
        username: 'unknown'
      };
    }
    
    // Debug removed for performance
    
    return (
      <ChatMessage
        item={item}
        index={index}
        currentUser={currentUser}
        recipientAvatar={recipientAvatar}
        recipientName={roomName}
        showTimeForMessages={(id) => showTimeForMessagesRef.current?.has?.(id) || false}
        timeAnimations={timeAnimations}
        selectionMode={selectedMessages && selectedMessages.length > 0}
        selectedMessages={selectedMessages || []}
        onMessagePress={(messageItem) => handleMessagePress(messageItem._id)}
        onLongPress={() => handleLongPress(item._id)}
        onImagePress={(image) => {
          setSelectedModalImage(image);
          setImageModalVisible(true);
        }}
        onFilePress={(file) => {
          console.log('File pressed:', file);
          if (file && file.url && file.fileName) {
            showFileOptions(file.url, file.fileName);
          } else if (file && file.url) {
            // Fallback for files without proper fileName
            const fileName = file.url.split('/').pop() || 'unknown_file';
            showFileOptions(file.url, fileName);
          }
        }}
        formatDateTime={formatDateTime}
        shouldShowTime={(id) => {
          try {
            const timeSet = showTimeForMessagesRef.current;
            if (!timeSet || typeof timeSet.has !== 'function') {
              return false;
            }
            return timeSet.has(id);
          } catch (error) {
            return false;
          }
        }}
        getFileIcon={getFileIcon}
        decodeFileName={decodeFileName}
        formatFileSize={formatFileSize}
      />
    );
  }, [currentUser, selectedMessages]); // Removed showTimeForMessages since we use ref

  // Utility functions for ChatMessage
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('th-TH', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const decodeFileName = (filename) => {
    try {
      return decodeURIComponent(filename || '');
    } catch (error) {
      return filename || 'Unknown File';
    }
  };

  // Helper functions
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

  const openImageModal = (imageUri) => {
    setSelectedModalImage(imageUri);
    setImageModalVisible(true);
  };

  // ฟังก์ชันดาวน์โหลดรูปภาพจาก Modal
  const downloadImageFromModal = async () => {
    if (!selectedModalImage) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบรูปภาพที่จะดาวน์โหลด');
      return;
    }

    try {
      console.log('📥 Starting image download from modal...');
      console.log('🖼️ Image URL:', selectedModalImage);
      
      // ตรวจสอบสิทธิ์การเข้าถึงไฟล์
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงไฟล์เพื่อบันทึกรูปภาพ');
        return;
      }

      // ปิด modal ก่อน
      setImageModalVisible(false);

      const timestamp = new Date().getTime();
      const fileName = `image_${timestamp}.jpg`;

      // สำหรับ Cloudinary URL ลองใช้วิธีตรง
      if (selectedModalImage.includes('cloudinary.com')) {
        try {
          console.log('🌤️ Trying direct Cloudinary save...');
          const asset = await MediaLibrary.saveToLibraryAsync(selectedModalImage);
          console.log('✅ Direct save successful:', asset);
          Alert.alert('สำเร็จ', 'บันทึกรูปภาพลงในแกลเลอรี่แล้ว');
          return;
        } catch (directError) {
          console.log('⚠️ Direct save failed, trying alternative method...');
        }
      }

      // วิธี fallback: ดาวน์โหลดไฟล์ชั่วคราว
      const token = await AsyncStorage.getItem('token');
      const headers = selectedModalImage.includes('cloudinary.com') ? {} : { Authorization: `Bearer ${token}` };
      
      const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${fileName}`;
      
      console.log('📍 Temp file path:', tempUri);
      console.log('🔄 Starting download with headers:', headers);
      
      const downloadResult = await FileSystem.downloadAsync(selectedModalImage, tempUri, {
        headers: headers
      });

      console.log('📊 Download result:', downloadResult);

      if (downloadResult.status === 200) {
        const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        
        // ลบไฟล์ชั่วคราว
        try {
          await FileSystem.deleteAsync(tempUri);
        } catch (deleteError) {
          console.log('⚠️ Could not delete temp file:', deleteError);
        }
        
        Alert.alert('สำเร็จ', 'บันทึกรูปภาพลงในแกลเลอรี่แล้ว');
        console.log('✅ Image saved to gallery:', asset);
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }

    } catch (error) {
      console.error('❌ Error downloading image from modal:', error);
      console.error('Error details:', {
        message: error.message,
        selectedModalImage: selectedModalImage,
        error: error.message
      });
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถดาวน์โหลดรูปภาพได้: ${error.message}`);
    }
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
        throw new Error('FileSystem.documentDirectory is not available');
      }
      
      // ไม่ต้องใช้ token สำหรับ Cloudinary files
      const token = await AsyncStorage.getItem('token');

      let fullUrl = fileUrl;
      
      // ตรวจสอบว่าเป็น Cloudinary URL หรือไม่
      if (fileUrl.includes('cloudinary.com')) {
        fullUrl = fileUrl;
        console.log('🌤️ Using Cloudinary URL directly:', fullUrl);
      } else if (!fileUrl.startsWith('http')) {
        fullUrl = `${API_URL}/${fileUrl.replace(/^\/+/, '')}`;
        console.log('🔗 Converted to full URL:', fullUrl);
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
        // สำหรับไฟล์สื่อ ให้บันทึกลงในแกลเลอรี่
        console.log('📷 Processing as media file...');
        
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงไฟล์เพื่อบันทึกสื่อ');
          return;
        }

        console.log('🔄 Downloading media to temp location...');
        
        const tempFileUri = `${FileSystem.documentDirectory}temp_${finalFileName}`;
        
        const downloadResult = await FileSystem.downloadAsync(fullUrl, tempFileUri, {
          headers: headers
        });

        console.log('📊 Media download result:', downloadResult);

        if (downloadResult.status === 200) {
          console.log('💾 Saving to media library...');
          const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          
          // ลบไฟล์ชั่วคราว
          try {
            await FileSystem.deleteAsync(tempFileUri);
          } catch (deleteError) {
            console.log('⚠️ Could not delete temp file:', deleteError);
          }
          
          Alert.alert('สำเร็จ', isImage ? 'บันทึกรูปภาพลงในแกลเลอรี่แล้ว' : 'บันทึกวิดีโอลงในแกลเลอรี่แล้ว');
          console.log('✅ Media saved to gallery:', asset);
        } else {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }
      } else {
        // สำหรับไฟล์ทั่วไป ให้ดาวน์โหลดและแชร์
        console.log('📁 Processing as regular file...');
        
        const localUri = `${FileSystem.documentDirectory}${finalFileName}`;
        console.log('📍 Target file path:', localUri);
        
        console.log('🔄 Starting file download...');
        const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri, {
          headers: headers
        });

        console.log('📊 File download result:', downloadResult);

        if (downloadResult.status === 200) {
          console.log('📤 Sharing downloaded file...');
          
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'application/octet-stream',
              dialogTitle: 'บันทึกไฟล์'
            });
            console.log('✅ File shared successfully');
          } else {
            Alert.alert('สำเร็จ', `ดาวน์โหลดไฟล์แล้ว: ${finalFileName}`);
            console.log('✅ File downloaded (sharing not available)');
          }
        } else {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }
      }
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      console.error('Error details:', {
        message: error.message,
        fileUrl: fileUrl,
        fileName: fileName
      });
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถดาวน์โหลดได้: ${error.message}`);
    }
  };

  const showFileOptions = (fileUrl, fileName) => {
    Alert.alert(
      'ไฟล์แนบ',
      `ชื่อไฟล์: ${fileName || 'ไม่ทราบชื่อ'}`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ดาวน์โหลด',
          onPress: () => downloadFile(fileUrl, fileName)
        }
      ]
    );
  };

  // ฟังก์ชันแสดงการแจ้งเตือนสำเร็จที่หายไปเอง
  const showSuccessNotification = (message) => {
    setSuccessNotification({ visible: true, message });
    setTimeout(() => {
      setSuccessNotification({ visible: false, message: '' });
    }, 3000); // หายไปใน 3 วินาที
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingOverlay 
          visible={true} 
          message="กำลังโหลดแชทส่วนตัว..." 
        />
      ) : (
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ChatHeader
            recipientName={recipientName}
            recipientAvatar={recipientAvatar}
            roomName={roomName}
            selectionMode={selectionMode}
            selectedMessages={selectedMessages}
            onBackPress={() => navigation.goBack()}
            onClearSelection={() => {
              setSelectionMode(false);
              setSelectedMessages([]);
            }}
            onDeleteSelected={deleteSelectedMessages}
            onManageChat={() => {
              setSelectionMode(true);
            }}
          />

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            style={styles.messagesList}
            inverted
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.1}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const isNearBottom = contentOffset.y < 100; // ใกล้ด้านล่าง 100px
              setShowScrollToBottom(!isNearBottom && messages.length > 0);
            }}
            scrollEventThrottle={16}
            ListFooterComponent={() => 
              canLoadMore ? (
                <LoadOlderMessagesPrivateChat
                  onLoadMore={loadMoreMessages}
                  isLoading={isLoadingMore}
                />
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
          />

          <ChatInputBar
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            isSending={isSending}
            selectedFile={selectedFile}
            selectedImage={selectedImage}
            showAttachmentMenu={showAttachmentMenu}
            setShowAttachmentMenu={setShowAttachmentMenu}
            onSendMessage={sendMessage}
            onPickImage={pickImage}
            onPickFile={pickFile}
            onRemoveFile={() => setSelectedFile(null)}
            getFileIcon={getFileIcon}
          />

          {/* Attachment Menu */}
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
          )}

          {/* Scroll to Bottom Button */}
          {showScrollToBottom && (
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
        </KeyboardAvoidingView>
      )}
      
      {/* Image Modal for Viewing and Downloading */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalCloseArea}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {selectedModalImage && (
                <Image
                  source={{ uri: selectedModalImage }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}

              <View style={styles.imageModalActions}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={downloadImageFromModal}
                >
                  <Text style={styles.downloadButtonText}>📥 บันทึกรูปภาพ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {successNotification.visible && (
        <View style={styles.successNotification}>
          <Text style={styles.successNotificationText}>
            ✅ {successNotification.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  keyboardAvoidingView: {
    flex: 1
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: SPACING.md
  },
  successNotification: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.medium
  },
  successNotificationText: {
    color: 'white',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center'
  },
  verticalAttachmentMenu: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120
  },
  verticalAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  attachmentMenuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 12
  },
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
  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '95%',
    height: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageModalActions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default PrivateChatScreen;