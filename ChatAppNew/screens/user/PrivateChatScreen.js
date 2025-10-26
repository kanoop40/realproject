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
import SuccessTickAnimation from '../../components/SuccessTickAnimation';
import { downloadFileWithFallback } from '../../utils/fileDownload';

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
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
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

  // Sync ref with state
  useEffect(() => {
    showTimeForMessagesRef.current = showTimeForMessages;
  }, [showTimeForMessages]);

  // Load messages when user and chatroom are ready - Load latest 30 messages only
  useEffect(() => {
    if (currentUser && chatroomId) {
      console.log('🚀 Loading latest 30 messages and auto-scrolling to bottom');
      loadMessages(1, false);
      setHasScrolledToEnd(false);
      setCurrentPage(1);
      
      // Force scroll to bottom after loading - only for initial load
      if (!hasScrolledToEnd) {
        setTimeout(() => {
          console.log('🎯 Force scrolling to latest message');
          flatListRef.current?.scrollToEnd({ animated: true });
          setHasScrolledToEnd(true);
        }, 800);
      }
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



  // Smart Background Sync (ไม่รีเฟรชหน้าจอ)
  useEffect(() => {
    let backgroundSync;
    
    if (currentUser && chatroomId) {
      console.log('� Starting background sync...');
      
      backgroundSync = setInterval(async () => {
        try {
          // เช็คข้อความใหม่โดยการโหลดข้อความล่าสุด
          const response = await api.get(`/chats/${chatroomId}/messages?page=1&limit=5`);
          const latestMessages = response.data.messages || [];
          
          // เช็คว่ามีข้อความใหม่หรือไม่
          const currentLatestId = messages[messages.length - 1]?._id;
          const serverLatestId = latestMessages[0]?._id;
          
          const hasNewMessages = latestMessages.length > 0 && 
            currentLatestId !== serverLatestId &&
            !messages.some(msg => msg._id === serverLatestId);
          
          if (hasNewMessages) {
            console.log('📨 New messages detected, adding to existing list...');
            
            // กรองเฉพาะข้อความใหม่ที่ยังไม่มีในระบบ
            const newMessages = latestMessages.filter(serverMsg => 
              !messages.some(localMsg => localMsg._id === serverMsg._id)
            );
            
            // Add comprehensive safety checks to new messages too
            const safeNewMessages = newMessages
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
            
            // เพิ่มข้อความใหม่เข้าไปโดยไม่รีเฟรช (Normal FlatList)
            setMessages(prev => [...prev, ...safeNewMessages]);
            
            // Auto scroll เฉพาะถ้าผู้ใช้อยู่ใกล้ล่างสุด (ไม่รบกวนเมื่อกำลังดูข้อความเก่า)
            if (!showScrollToBottom) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }
          }
        } catch (error) {
          console.log('🔄 Background sync failed:', error.message);
          // ไม่ต้องแสดง error เพราะ background sync ล้มเหลวเป็นเรื่องปกติ
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
    if (!currentUser || !chatroomId || (page === 1 && isLoading)) return;
    
    if (page === 1) setIsLoading(true);
    
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
        console.log('📋 Set initial messages:', safeMessages.length);
      } else {
        // Prevent duplicate messages when loading more
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg._id));
          const newMessages = safeMessages.filter(msg => !existingIds.has(msg._id));
          console.log('📋 Adding new messages:', newMessages.length, 'to existing:', prev.length);
          return [...prev, ...newMessages];
        });
      }
      
      // Update canLoadMore logic แบบ GroupChat
      if (safeMessages.length === 0) {
        setCanLoadMore(false);
      } else if (safeMessages.length < 30) {
        setCanLoadMore(false);
      } else {
        setCanLoadMore(true);
        console.log('📚 Initial load - canLoadMore set to true');
      }
      
      setCurrentPage(page);
      
      // Auto scroll to latest message (Normal FlatList) - Always scroll when loading page 1
      if (page === 1) {
        console.log('🎯 Auto-scrolling to latest message...');
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
        // Additional scroll after a bit more delay to ensure content is rendered
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 600);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (page === 1) setIsLoading(false);
    }
  }, [currentUser, chatroomId, isLoading]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !canLoadMore) {
      console.log('🚫 Load more blocked:', { isLoadingMore, canLoadMore });
      return;
    }
    
    // เพิ่มการบันทึก log สำหรับการโหลดข้อความเก่าผ่านปุ่ม
    const actualMessageCount = messages.filter(msg => msg.type !== 'date_separator').length;
    console.log('� Manual loading older messages - current count:', actualMessageCount);
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      console.log(`📚 Loading more messages - page ${nextPage}`);
      
      const response = await api.get(`/chats/${chatroomId}/messages?limit=30&page=${nextPage}`);
      const olderMessages = response.data.messages || [];
      
      // อัปเดต canLoadMore logic แบบ GroupChat
      if (olderMessages.length === 0) {
        setCanLoadMore(false);
      } else if (olderMessages.length < 30) {
        setCanLoadMore(false);
      } else {
        setCanLoadMore(true);
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
        
        // Prevent duplicate messages
        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg._id));
          const newMessages = safeOlderMessages.filter(msg => !existingIds.has(msg._id));
          console.log('📋 Prepending older messages:', newMessages.length, 'to existing:', prev.length);
          return [...newMessages, ...prev];
        });
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
    const tempId = 'temp_' + Date.now() + '_' + Math.random() + '_' + currentUser._id;
    
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
      fileUrl: selectedFile ? selectedFile.uri : null, // เพิ่ม fileUrl เหมือนในแชทกลุ่ม
      file: selectedFile ? {
        name: selectedFile.name || selectedFile.fileName,
        uri: selectedFile.uri,
        size: selectedFile.size || selectedFile.fileSize
      } : null,
      user_id: currentUser,
      isOptimistic: true,
      isTemporary: true // เพิ่ม flag เหมือนในแชทกลุ่ม
    };
    
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      // เลื่อนไปข้อความล่าสุดทันทีหลังส่งข้อความ (Normal FlatList)
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
        // ลองใช้ fetch API แทน axios สำหรับ file upload
        console.log('📤 Attempting to send file with proper FormData formatting');
        
        try {
          const formData = new FormData();
          formData.append('content', contentToSend);
          formData.append('messageType', messageType);
          
          // React Native FormData requires specific format
          formData.append('file', {
            uri: fileToSend.uri,
            type: fileToSend.mimeType || fileToSend.type || 'application/octet-stream',
            name: fileToSend.name || fileToSend.fileName || 'file.txt'
          });
          
          console.log('📋 FormData prepared:', {
            content: contentToSend,
            messageType: messageType,
            fileName: fileToSend.name || fileToSend.fileName
          });

          console.log('📤 FormData created, attempting send...');
          
          response = await api.post(`/chats/${chatroomId}/messages`, formData, {
            headers: {
              // ให้ axios ตั้งค่า Content-Type เอง สำหรับ FormData
            },
            timeout: 60000 // เพิ่ม timeout
          });
          
          console.log('✅ File sent successfully via FormData');
          
        } catch (formError) {
          console.log('❌ FormData failed, trying alternative approach:', formError.message);
          
          // ถ้า FormData ไม่ได้ผล ให้ส่งเป็น text message แทน
          response = await api.post(`/chats/${chatroomId}/messages`, {
            content: contentToSend + ' [ไฟล์: ' + (fileToSend.name || fileToSend.fileName || 'unknown') + ']',
            sender_id: currentUser._id,
            messageType: 'text'
          });
          
          console.log('✅ Sent as text message instead of file');
        }
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
            console.log('🔍 Processing server message:', {
              fileName: serverMessage.fileName,
              messageType: serverMessage.messageType || serverMessage.type,
              mimeType: serverMessage.mimeType,
              fileUrl: serverMessage.fileUrl || serverMessage.file_url
            });
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
              fileUrl: serverMessage.fileUrl || serverMessage.file_url, // เพิ่ม fileUrl
              file: serverMessage.file || (serverMessage.fileName ? {
                name: serverMessage.fileName,
                size: serverMessage.fileSize,
                type: serverMessage.mimeType
              } : null),
              user_id: serverMessage.user_id || serverMessage.sender,
              isOptimistic: false,
              isTemporary: false
            };
          }
          return msg;
        });
        
        // เลื่อนไปข้อความล่าสุดหลังจากได้รับตอบกลับจากเซิร์ฟเวอร์ (Normal FlatList)
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
        
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
        errorMessage = 'เกิดข้อผิดพลาด: ' + (error.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ');
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
    const tempId = 'temp_' + Date.now() + '_' + Math.random() + '_' + currentUser._id;
    
    try {
    const optimisticMessage = {
      _id: tempId,
      content: 'รูปภาพ',
      sender: currentUser,
      timestamp: new Date().toISOString(),
      messageType: 'image',
      image: imageAsset.uri, // เพิ่ม local URI สำหรับ optimistic display
      fileUrl: imageAsset.uri, // เพิ่ม fileUrl สำหรับ fallback
      user_id: currentUser,
      isOptimistic: true
    };      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
        return newMessages;
      });
      
      const fileName = imageAsset.fileName || imageAsset.filename || ('image_' + Date.now() + '.jpg');
      
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
        fileData: {
          name: fileName,
          type: 'image/jpeg',
          base64: base64
        },
        mimeType: 'image/jpeg'
      });

      console.log('📥 Server response for image:', response.data);
      console.log('🔍 Full response structure:', {
        message: response.data.message,
        fileUrl: response.data.fileUrl || response.data.message?.fileUrl,
        image: response.data.image || response.data.message?.image,
        file: response.data.file || response.data.message?.file
      });

      setMessages(prev => {
        const updatedMessages = prev.map(msg => {
          if (msg._id === tempId) {
            const serverMessage = response.data.message || response.data;
            console.log('🖼️ Processing server image message:', {
              serverMessage,
              fileUrl: serverMessage.fileUrl,
              image: serverMessage.image,
              file: serverMessage.file
            });
            
            return {
              ...serverMessage,
              _id: serverMessage._id,
              content: serverMessage.content,
              sender: serverMessage.sender || currentUser,
              timestamp: serverMessage.timestamp || serverMessage.time, // Backend ใช้ field 'time'
              messageType: serverMessage.messageType || 'image',
              fileName: serverMessage.fileName,
              fileSize: serverMessage.fileSize,
              mimeType: serverMessage.mimeType || 'image/jpeg',
              fileUrl: serverMessage.fileUrl, // URL จาก Cloudinary
              image: serverMessage.fileUrl || serverMessage.image, // ใช้ fileUrl เป็น image
              file: serverMessage.file || {
                name: serverMessage.fileName,
                size: serverMessage.fileSize,
                type: serverMessage.mimeType || 'image/jpeg',
                url: serverMessage.fileUrl
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
        errorMessage = 'เกิดข้อผิดพลาด: ' + (error.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ');
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
        // ซ่อนเวลา
        newSet.delete(messageId);
      } else {
        // แสดงเวลา
        newSet.add(messageId);
        
        // สร้าง animation หากยังไม่มี
        if (!timeAnimations[messageId]) {
          const newAnimation = new Animated.Value(0);
          setTimeAnimations(prev => ({
            ...prev,
            [messageId]: newAnimation
          }));
          
          // เริ่ม animation ทันที
          Animated.timing(newAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false
          }).start();
        } else {
          // ถ้ามี animation อยู่แล้ว ให้เริ่มทันที
          Animated.timing(timeAnimations[messageId], {
            toValue: 1,
            duration: 200,
            useNativeDriver: false
          }).start();
        }
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
      
      // ตรวจสอบว่าเป็นข้อความของผู้ส่งปัจจุบันหรือไม่ (ใช้วิธีจาก backup)
      const isMyMessage = (
        (typeof message.sender === 'object' && message.sender?._id === currentUser._id) ||
        (typeof message.sender === 'string' && (
          message.sender === currentUser?.firstName ||
          message.sender === currentUser?.firstName?.split(' ')[0] ||
          currentUser?.firstName?.startsWith(message.sender) ||
          message.sender.includes(currentUser?.firstName?.split(' ')[0] || '')
        ))
      );
      
      // ลบได้เฉพาะข้อความของตัวเอง
      if (!isMyMessage) {
        return; // กดไม่ได้เลย (ไม่แสดง Alert)
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
      // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่ (ใช้วิธีจาก backup)
      const message = messages.find(msg => msg._id === messageId);
      if (!message) return;
      
      const isMyMessage = (
        (typeof message.sender === 'object' && message.sender?._id === currentUser._id) ||
        (typeof message.sender === 'string' && (
          message.sender === currentUser?.firstName ||
          message.sender === currentUser?.firstName?.split(' ')[0] ||
          currentUser?.firstName?.startsWith(message.sender) ||
          message.sender.includes(currentUser?.firstName?.split(' ')[0] || '')
        ))
      );
      
      // เข้าโหมดเลือกได้เฉพาะข้อความของตัวเอง
      if (isMyMessage) {
        setSelectionMode(true);
        setSelectedMessages([messageId]);
      }
      // ถ้าไม่ใช่ข้อความของตัวเอง ไม่ทำอะไร (ไม่แสดง Alert)
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
      'คุณต้องการลบ ' + selectedMessages.length + ' ข้อความของคุณหรือไม่?\n(ลบจากเซิร์ฟเวอร์และทุกคนจะไม่เห็นข้อความนี้)',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Starting to delete selected messages...');
              console.log('📝 Selected messages:', selectedMessages);

              const token = await AsyncStorage.getItem('userToken');
              
              // ลบข้อความทีละข้อ
              for (const messageId of selectedMessages) {
                try {
                  const response = await fetch(`${API_URL}/api/chats/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error('Failed to delete message ' + messageId + ': ' + response.status + ' - ' + errorData);
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

    // ถ้าเป็น date separator
    if (item.type === 'date_separator') {
      return renderDateSeparator(item.date);
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
        showTimeForMessages={showTimeForMessages}
        timeAnimations={timeAnimations}
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
        onMessagePress={item._id ? () => handleMessagePress(item._id) : undefined}
        onLongPress={item._id ? () => handleLongPress(item._id) : undefined}
        onImagePress={openImageModal}
        onFilePress={showFileOptions}
        formatDateTime={formatDateTime}
        shouldShowTime={(messageId) => showTimeForMessages.has(messageId)}
        getFileIcon={getFileIcon}
        decodeFileName={decodeFileName}
        formatFileSize={formatFileSize}
      />
    );
  }, [currentUser, selectedMessages, showTimeForMessages]); // Added showTimeForMessages back

  // Utility functions for ChatMessage
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

  // ฟังก์ชันสำหรับจัดกลุ่มข้อความตามวัน (แก้ไขสำหรับ Normal FlatList)
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    // เรียงข้อความจากเก่าไปใหม่ (Normal FlatList)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const grouped = [];
    let currentDate = null;
    
    sortedMessages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      // ถ้าเป็นวันใหม่ ให้เพิ่ม date separator
      if (messageDate !== currentDate) {
        grouped.push({
          type: 'date_separator',
          date: message.timestamp,
          _id: 'date_' + messageDate.replace(/\s/g, '_') + '_' + index
        });
        currentDate = messageDate;
      }
      
      grouped.push(message);
    });
    
    // ไม่ reverse เพราะใช้ normal FlatList
    return grouped;
  };

  // ฟังก์ชันสำหรับแสดงวันที่แบบสั้น (เพิ่มใหม่)
  const formatDateShort = (timestamp) => {
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

  // Render date separator (เพิ่มใหม่)
  const renderDateSeparator = (date) => {
    return (
      <View style={styles.dateSeparatorContainer}>
        <View style={styles.dateSeparatorBadge}>
          <Text style={styles.dateSeparatorText}>
            {formatDateShort(date)}
          </Text>
        </View>
      </View>
    );
  };

  const decodeFileName = (filename) => {
    try {
      return decodeURIComponent(filename || '');
    } catch (error) {
      return filename || 'Unknown File';
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
      
      // ตรวจสอบสิทธิ์การเข้าถึงไฟล์ แบบมี fallback
      let permissionGranted = false;
      
      try {
        const permissionResult = await MediaLibrary.requestPermissionsAsync();
        console.log('🔐 Permission result:', permissionResult);
        permissionGranted = (permissionResult && permissionResult.status === 'granted');
      } catch (permissionError) {
        console.error('⚠️ Permission request error:', permissionError.message);
        console.log('🔄 Using sharing fallback for image download...');
        permissionGranted = false;
      }
      
      if (!permissionGranted) {
        console.log('📤 Using sharing fallback for image');
        // Fall back to download and share
        try {
          const tempUri = `${FileSystem.documentDirectory}temp_image_${Date.now()}.jpg`;
          const downloadResult = await FileSystem.downloadAsync(selectedModalImage, tempUri, {});
          
          if (downloadResult.status === 200) {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(downloadResult.uri, {
                mimeType: 'image/*',
                dialogTitle: 'บันทึกรูปภาพ'
              });
              console.log('✅ Image shared successfully');
            } else {
              Alert.alert('ดาวน์โหลดสำเร็จ', 'รูปภาพถูกดาวน์โหลดแล้ว');
            }
          } else {
            throw new Error(`ดาวน์โหลดล้มเหลว: HTTP ${downloadResult.status}`);
          }
          return;
        } catch (fallbackError) {
          console.error('❌ Sharing fallback failed:', fallbackError);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดรูปภาพได้: ' + fallbackError.message);
          return;
        }
      }
      
      // ถ้ามี permission แล้ว ให้ทำต่อตามเดิม
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
          setShowSuccessAnimation(true);
          return;
        } catch (directError) {
          console.log('⚠️ Direct save failed:', directError.message);
          console.log('🔄 Trying alternative download method...');
        }
      }

      // วิธี fallback: ดาวน์โหลดไฟล์ชั่วคราว
      const token = await AsyncStorage.getItem('userToken'); // Fixed: should be 'userToken' not 'token'
      const headers = selectedModalImage.includes('cloudinary.com') ? {} : { Authorization: `Bearer ${token}` };
      
      const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${fileName}`;
      
      console.log('📍 Temp file path:', tempUri);
      console.log('🔄 Starting download with headers:', headers);
      
      const downloadResult = await FileSystem.downloadAsync(selectedModalImage, tempUri, {
        headers: headers
      });

      console.log('📊 Download result:', downloadResult);

      if (downloadResult.status === 200) {
        try {
          const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          console.log('✅ Image saved to gallery:', asset);
          setShowSuccessAnimation(true);
        } catch (saveError) {
          console.error('❌ Error saving to gallery:', saveError);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกรูปภาพลงในแกลเลอรี่ได้: ' + saveError.message);
        }
        
        // ลบไฟล์ชั่วคราว
        try {
          await FileSystem.deleteAsync(tempUri);
        } catch (deleteError) {
          console.log('⚠️ Could not delete temp file:', deleteError);
        }
      } else {
        throw new Error('Download failed with status: ' + downloadResult.status);
      }

    } catch (error) {
      console.error('❌ Error downloading image from modal:', error);
      console.error('Error details:', {
        message: error.message,
        selectedModalImage: selectedModalImage,
        error: error.message
      });
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดรูปภาพได้: ' + (error.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'));
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
      const token = await AsyncStorage.getItem('userToken'); // Fixed: should be 'userToken' not 'token'

      let fullUrl = fileUrl;
      
      // ตรวจสอบว่าเป็น Cloudinary URL หรือไม่
      if (fileUrl.includes('cloudinary.com')) {
        // สำหรับ Cloudinary URL - ประมวลผล URL อย่างระมัดระวัง
        let processedUrl = fileUrl;
        
        try {
          // ตรวจสอบ URL encoding issues
          if (processedUrl.includes('%')) {
            processedUrl = decodeURIComponent(processedUrl);
          }
          
          fullUrl = processedUrl;
        } catch (urlError) {
          console.log('⚠️ URL processing error:', urlError.message);
          // Fallback ใช้ URL เดิม
          fullUrl = fileUrl;
        }
        
        console.log('🌤️ Using processed Cloudinary URL:', fullUrl);
      } else if (!fileUrl.startsWith('http')) {
        fullUrl = `${API_URL}/${fileUrl.replace(/^\/+/, '')}`;
        console.log('🔗 Converted to full URL:', fullUrl);
      }

      const finalFileName = fileName || ('file_' + new Date().getTime());
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
        
        try {
          let permissionGranted = false;
          
          try {
            const permissionResult = await MediaLibrary.requestPermissionsAsync();
            console.log('🔐 Media permission result:', permissionResult);
            permissionGranted = (permissionResult && permissionResult.status === 'granted');
          } catch (permissionError) {
            console.log('⚠️ MediaLibrary permission request failed:', permissionError.message);
            console.log('🔄 Will use sharing instead of media library...');
            permissionGranted = false;
          }
          
          if (!permissionGranted) {
            console.log('📤 Using sharing fallback for media download');
            // Fall back to regular file download and sharing
            const tempUri = `${FileSystem.documentDirectory}temp_${Date.now()}_${finalFileName}`;
            
            const downloadResult = await FileSystem.downloadAsync(fullUrl, tempUri, { headers });
            
            if (downloadResult.status === 200) {
              console.log('📤 Sharing downloaded media file...');
              const canShare = await Sharing.isAvailableAsync();
              
              if (canShare) {
                await Sharing.shareAsync(downloadResult.uri, {
                  mimeType: isImage ? 'image/*' : 'video/*',
                  dialogTitle: 'บันทึกไฟล์สื่อ'
                });
                console.log('✅ Media shared successfully');
              } else {
                Alert.alert('ดาวน์โหลดสำเร็จ', `ไฟล์ถูกดาวน์โหลดแล้ว: ${downloadResult.uri}`);
              }
            } else {
              throw new Error(`ดาวน์โหลดล้มเหลว: HTTP ${downloadResult.status}`);
            }
            return;
          }
        } catch (permissionError) {
          console.error('❌ Media permission request error:', permissionError);
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถขอสิทธิ์การเข้าถึงไฟล์ได้');
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
          try {
            const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
            console.log('✅ Media saved to gallery:', asset);
            setShowSuccessAnimation(true);
          } catch (saveError) {
            console.error('❌ Error saving media to gallery:', saveError);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกไฟล์ลงในแกลเลอรี่ได้: ' + saveError.message);
          }
          
          // ลบไฟล์ชั่วคราว
          try {
            await FileSystem.deleteAsync(tempFileUri);
          } catch (deleteError) {
            console.log('⚠️ Could not delete temp file:', deleteError);
          }
        } else {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }
      } else {
        // สำหรับไฟล์ทั่วไป ให้ดาวน์โหลดและแชร์
        console.log('📁 Processing as regular file...');
        
        const localUri = `${FileSystem.documentDirectory}${finalFileName}`;
        console.log('📍 Target file path:', localUri);
        
        console.log('🔄 Starting file download...');
        const downloadResult = await downloadFileWithFallback(
          fullUrl,
          finalFileName,
          async (urlToTry) => {
            console.log('🔄 Trying URL:', urlToTry);
            
            // Determine headers based on URL type
            const downloadHeaders = urlToTry.includes('cloudinary.com') ? {} : headers;
            
            return await FileSystem.downloadAsync(urlToTry, localUri, {
              headers: downloadHeaders
            });
          }
        );

        console.log('📊 File download result:', downloadResult);

        // Handle the new downloadFileWithFallback response structure
        const actualResult = downloadResult.success ? downloadResult.result : downloadResult;
        const downloadSuccess = downloadResult.success && 
          actualResult && 
          actualResult.status === 200 && 
          actualResult.headers &&
          actualResult.headers['content-length'] !== '0' &&
          !actualResult.headers['x-cld-error'];

        if (downloadSuccess) {
          console.log('✅ Download successful');
          console.log(`📊 Successfully downloaded using attempt ${downloadResult.attemptNumber} with URL: ${downloadResult.successUrl?.substring(0, 50)}...`);
          console.log('📤 Sharing downloaded file...');
          
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(actualResult.uri, {
              mimeType: 'application/octet-stream',
              dialogTitle: 'บันทึกไฟล์'
            });
            console.log('✅ File shared successfully');
          } else {
            setShowSuccessAnimation(true);
            console.log('✅ File downloaded (sharing not available)');
          }
        } else {
          let errorMessage = 'การดาวน์โหลดไม่สำเร็จ';
          
          if (actualResult?.status === 404 || actualResult?.headers?.['x-cld-error']) {
            errorMessage = 'ไม่พบไฟล์ (HTTP 404)\n\nไฟล์อาจถูกลบหรือย้ายตำแหน่งแล้ว';
          } else if (actualResult?.headers?.['content-length'] === '0') {
            errorMessage = 'ไฟล์ว่างเปล่า (0 bytes)\n\nไฟล์อาจเสียหายหรือไม่สมบูรณ์';
          } else {
            errorMessage = `HTTP ${actualResult?.status || 'unknown'}: การดาวน์โหลดไม่สำเร็จ`;
          }
          
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      console.error('Error details:', {
        message: error.message,
        fileUrl: fileUrl,
        fileName: fileName
      });
      
      // ให้ข้อมูลข้อผิดพลาดที่เป็นประโยชน์
      let errorMessage = 'ไม่สามารถดาวน์โหลดไฟล์ได้';
      
      if (error.message.includes('401')) {
        errorMessage = 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้ (HTTP 401)\n\nสาเหตุที่เป็นไปได้:\n• ไฟล์อาจถูกลบหรือย้าย\n• ลิงก์ไฟล์หมดอายุ\n• ปัญหาการตั้งค่าเซิร์ฟเวอร์';
      } else if (error.message.includes('404')) {
        errorMessage = 'ไม่พบไฟล์ (HTTP 404)\n\nไฟล์อาจถูกลบหรือย้ายตำแหน่งแล้ว';
      } else if (error.message.includes('Network')) {
        errorMessage = 'ปัญหาการเชื่อมต่อเครือข่าย\n\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else {
        errorMessage = `ไม่สามารถดาวน์โหลดได้: ${error.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`;
      }
      
      Alert.alert('ข้อผิดพลาดในการดาวน์โหลด', errorMessage);
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

  // ฟังก์ชันแสดงการแจ้งเตือนสำเร็จด้วย Tick Animation
  const showSuccessNotification = (message) => {
    console.log('✅ Showing success animation for:', message);
    setShowSuccessAnimation(true);
  };

  // ฟังก์ชันจัดการเมื่อ animation จบ
  const handleSuccessAnimationComplete = () => {
    setShowSuccessAnimation(false);
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
            onCancelSelection={() => {
              setSelectionMode(false);
              setSelectedMessages([]);
            }}
            onDeleteSelected={deleteSelectedMessages}
            onManageChat={() => {
              setSelectionMode(true);
            }}
          />

          {/* Selection Mode Banner */}
          {selectionMode && (
            <View style={styles.selectionBanner}>
              <Text style={styles.selectionText}>
                {'โหมดเลือกข้อความ - กดที่ข้อความเพื่อเลือก (' + selectedMessages.length + ' เลือกแล้ว)'}
              </Text>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={groupMessagesByDate(messages)}
            keyExtractor={(item, index) => item._id || `fallback_${index}`}
            renderItem={renderMessage}
            style={styles.messagesList}
            inverted={false}
            onEndReached={null}
            onEndReachedThreshold={0.1}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={3}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={100}
            getItemLayout={null}
            onScroll={(event) => {
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
              const isNearTop = contentOffset.y < 50; // ลดอีกเพื่อให้ปุ่มแสดงเฉพาะตอนที่เลื่อนไปบนสุดจริงๆ
              
              setShowScrollToBottom(!isAtBottom);
              
              // แสดงปุ่มโหลดข้อความเก่าเฉพาะตอนเลื่อนไปด้านบนสุด (ไม่โหลดอัตโนมัติ)
              const actualMessageCount = messages.filter(msg => msg.type !== 'date_separator').length;
              const shouldShowLoadButton = isNearTop && canLoadMore && actualMessageCount >= 5 && !isLoadingMore;
              
              // แสดง debug เฉพาะเมื่อปุ่มควรจะแสดง
              if (shouldShowLoadButton) {
                console.log('📜 Load older button will show - offset:', contentOffset.y, 'messages:', actualMessageCount);
              }
              
              setShowLoadOlderButton(shouldShowLoadButton);
            }}
            scrollEventThrottle={16}
            ListHeaderComponent={() => (
              <LoadOlderMessagesPrivateChat
                visible={showLoadOlderButton}
                isLoading={isLoadingMore}
                canLoadMore={canLoadMore}
                onLoadMore={loadMoreMessages}
                messagesCount={messages.filter(msg => msg.type !== 'date_separator').length}
              />
            )}
            ListFooterComponent={() => null}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyMessageContainer}>
                <Text style={styles.emptyMessageText}>
                  ยังไม่มีข้อความในแชทนี้
                </Text>
                <Text style={styles.emptyMessageSubText}>
                  เริ่มส่งข้อความกัน!
                </Text>
              </View>
            )}
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
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalDownloadButton}
                onPress={downloadImageFromModal}
              >
                <Text style={styles.modalDownloadText}>📥 บันทึกรูปภาพ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          renderFooter={() => null}
          backgroundColor="rgba(0,0,0,0.9)"
          enablePreload={true}
          saveToLocalByLongPress={false}
        />
      </Modal>
      
      {/* Success Tick Animation */}
      <SuccessTickAnimation
        visible={showSuccessAnimation}
        onComplete={handleSuccessAnimationComplete}
      />
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
  },
  // Date Separator Styles
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md
  },
  dateSeparatorBadge: {
    backgroundColor: '#E6B800',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  // Modal Header Styles
  modalHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 999
  },
  modalDownloadButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalDownloadText: {
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600'
  },
  modalCloseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8
  },
  modalCloseText: {
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold'
  },
  // Selection Banner Styles
  selectionBanner: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  selectionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  // Empty Message Styles
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
  }
});

export default PrivateChatScreen;