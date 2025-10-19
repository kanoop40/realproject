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
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
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
  const [showChatContent, setShowChatContent] = useState(true); // แสดงเนื้อหาแชททันที
  const [currentPage, setCurrentPage] = useState(1);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTimeForMessages, setShowTimeForMessages] = useState(new Set());
  const [timeAnimations, setTimeAnimations] = useState({});
  const [successNotification, setSuccessNotification] = useState({ visible: false, message: '' }); // แจ้งเตือนสำเร็จ
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
  useEffect(() => {
    if (currentUser && chatroomId) {
      console.log('🚀 Loading initial 30 messages and scrolling to latest');
      loadMessages(1, false); // โหลดข้อความล่าสุด 30 ข้อความ
      setHasScrolledToEnd(false);
      setCurrentPage(1);
    }
  }, [currentUser, chatroomId]);

  // Setup socket listeners when user and chatroom are ready
  useEffect(() => {
    if (socket && chatroomId && currentUser) {
      console.log('🔌 Setting up socket listeners for private chat:', chatroomId);
      
      joinChatroom(chatroomId);

      const handleNewMessage = (data) => {
        console.log('💬 PrivateChatScreen - New message received:', data);
        
        if (data.chatroomId !== chatroomId) {
          return;
        }
        
        setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg._id === data.message._id);
          
          if (messageExists) {
            console.log('🔄 Message already exists in chat, skipping...');
            return prevMessages;
          }
          
          if (data.message && data.message.sender && data.message.sender._id !== currentUser?._id) {
            console.log('✅ Message is from other user, processing...');
            
            const newMessage = {
              _id: data.message._id,
              content: data.message.content,
              sender: data.message.sender,
              timestamp: data.message.timestamp,
              messageType: data.message.messageType,
              file: data.message.file,
              fileUrl: data.message.fileUrl,
              fileName: data.message.fileName,
              fileSize: data.message.fileSize,
              mimeType: data.message.mimeType,
              user_id: data.message.sender
            };
            
            const newMessages = [...prevMessages, newMessage];
            
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
              
              // Show time for new message automatically after 500ms
              setTimeout(() => {
                if (newMessage._id) {
                  toggleTimeDisplay(newMessage._id);
                }
              }, 500);
            }, 100);
            
            return newMessages;
          } else {
            console.log('❌ Message is from current user, skipping socket event');
            return prevMessages;
          }
        });
        
        // Mark messages as read
        if (chatroomId && data.message && data.message.sender && data.message.sender._id !== currentUser?._id) {
          api.put(`/chats/${chatroomId}/read`).then(() => {
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

      const handleMessageRead = (data) => {
        console.log('👁️ PrivateChatScreen - Message read update received:', data);
        
        if (data.chatroomId === chatroomId) {
          console.log('✅ Updating messages read status in PrivateChatScreen');
          setMessages(prevMessages => {
            const updatedMessages = prevMessages.map(msg => {
              if (msg.sender._id === currentUser._id && data.readBy !== currentUser._id) {
                console.log('📖 Marking MY message as read by recipient:', msg._id);
                return { ...msg, isRead: true };
              }
              return msg;
            });
            return updatedMessages;
          });
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);
      socket.on('message_edited', handleMessageEdited);
      socket.on('messageRead', handleMessageRead);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
        socket.off('message_edited', handleMessageEdited);
        socket.off('messageRead', handleMessageRead);
        if (chatroomId) {
          leaveChatroom(chatroomId);
        }
      };
    }
  }, [socket, chatroomId, currentUser]);

  // Auto-scroll to latest message on first load - Multiple attempts
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToEnd && !isLoadingMore) {
      console.log('📍 Auto-scrolling to latest message on first load:', messages.length);
      
      // หลายครั้งเพื่อให้แน่ใจ
      const scrollAttempts = [50, 150, 300, 600];
      const timeouts = [];
      
      scrollAttempts.forEach((delay, index) => {
        const timeoutId = setTimeout(() => {
          try {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: false });
              console.log(`✅ Scroll attempt ${index + 1} completed`);
              
              if (index === scrollAttempts.length - 1) {
                setHasScrolledToEnd(true);
                console.log('🎯 Final scroll to bottom completed');
                
                // Show time for the latest message automatically
                const latestMessage = messages.filter(msg => msg.type !== 'date_separator').pop();
                if (latestMessage && latestMessage._id) {
                  setTimeout(() => {
                    toggleTimeDisplay(latestMessage._id);
                  }, 1000);
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ Scroll attempt ${index + 1} failed:`, error);
          }
        }, delay);
        
        timeouts.push(timeoutId);
      });
      
      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [messages.length, hasScrolledToEnd, isLoadingMore]);

  const loadCurrentUser = useCallback(async () => {
    setIsLoading(true); // เริ่ม loading ตั้งแต่โหลด user
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
      setIsLoading(false); // หยุด loading หากเกิดข้อผิดพลาด
      if (error.response?.status === 401) {
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    }
  }, [navigation]);

  const loadMessages = useCallback(async (page = 1, isRefresh = false) => {
    if (page === 1) {
      setIsLoading(true); // เริ่ม loading เมื่อโหลดหน้าแรก
    }
    
    if (isRefresh) {
      setCurrentPage(1);
      setCanLoadMore(true);
    }
    
    let loadedMessages = [];
    try {
      console.log(`📥 Loading messages - Page: ${page}, Limit: 30`);
      
      const loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Message loading timeout - taking too long');
        Alert.alert('การโหลดล่าช้า', 'การโหลดข้อความใช้เวลานานกว่าปกติ');
      }, 8000);
      
      const response = await Promise.race([
        api.get(`/chats/${chatroomId}/messages?limit=30&page=${page}`),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Message loading timeout')), 10000)
        )
      ]);
      
      clearTimeout(loadingTimeout);
      loadedMessages = response.data.messages || [];
      
      console.log(`📨 Received ${loadedMessages.length} messages for page ${page}`);
      
      // ตรวจสอบว่าสามารถโหลดเพิ่มได้หรือไม่
      if (loadedMessages.length < 30) {
        setCanLoadMore(false);
        console.log('🔚 No more messages available');
      } else {
        setCanLoadMore(true);
      }
      
      if (isRefresh) {
        setMessages(loadedMessages.map(msg => ({
          ...msg,
          isRead: msg.isRead !== undefined ? msg.isRead : false
        })));
        setHasScrolledToEnd(false);
        console.log('🔄 Refreshed messages, will scroll to bottom');
        
        // Force scroll to bottom หลัง refresh
        setTimeout(() => {
          [50, 100, 200, 400].forEach((delay) => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, delay);
          });
          
          setTimeout(() => {
            setHasScrolledToEnd(true);
          }, 450);
        }, 100);
      } else if (page === 1) {
        if (loadedMessages.length === 0) {
          setMessages([]);
          setHasScrolledToEnd(true);
        } else {
          loadedMessages.forEach((msg, index) => {
            const isMyMessage = (
              (typeof msg.sender === 'object' && msg.sender?._id === currentUser?._id) ||
              (typeof msg.sender === 'string' && (
                msg.sender === currentUser?.firstName ||
                msg.sender === currentUser?.firstName?.split(' ')[0] ||
                currentUser?.firstName?.startsWith(msg.sender) ||
                msg.sender.includes(currentUser?.firstName?.split(' ')[0] || '')
              ))
            );
            
            if (isMyMessage && msg.isRead === undefined) {
              console.warn('⚠️ Message of current user missing isRead status:', msg._id);
            }
          });
          
          setMessages(loadedMessages.map(msg => ({
            ...msg,
            isRead: msg.isRead !== undefined ? msg.isRead : false
          })));
          setHasScrolledToEnd(false);
          setCurrentPage(1);
          console.log('📨 Initial messages loaded, will scroll to bottom');
          
          // Force scroll to bottom หลังโหลดข้อความ
          setTimeout(() => {
            [50, 100, 200, 400, 600].forEach((delay) => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, delay);
            });
          }, 100);
        }
      } else {
        // Load more messages - append to existing
        setMessages(prevMessages => [
          ...loadedMessages.map(msg => ({
            ...msg,
            isRead: msg.isRead !== undefined ? msg.isRead : false
          })),
          ...prevMessages
        ]);
      }
      
      if (loadedMessages.length > 0) {
        try {
          await Promise.race([
            api.put(`/chats/${chatroomId}/read`),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Read status timeout')), 5000)
            )
          ]);
          
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
        setMessages([]);
      }
    } finally {
      console.log('✅ Messages loading completed');
      if (page === 1) {
        setIsLoading(false);
      }
    }
  }, [chatroomId, currentUser, socket]);

  // Refresh messages
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadMessages(1, true);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMessages]);

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
        console.log('📚 No more messages to load');
      }
      
      if (olderMessages.length > 0) {
        // เก็บตำแหน่งปัจจุบันก่อนเพิ่มข้อความเก่า
        const currentScrollOffset = flatListRef.current?._listRef?._scrollMetrics?.offset || 0;
        
        setMessages(prevMessages => [
          ...olderMessages.map(msg => ({
            ...msg,
            isRead: msg.isRead !== undefined ? msg.isRead : false
          })),
          ...prevMessages
        ]);
        setCurrentPage(nextPage);
        console.log(`✅ Loaded ${olderMessages.length} older messages`);
        
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
        file_name: selectedFile.name || selectedFile.fileName,
        url: selectedFile.uri,
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
        const originalFileName = fileToSend.name || fileToSend.fileName || 'unknown_file';
        
        const fileObj = {
          uri: fileToSend.uri,
          type: fileToSend.mimeType || fileToSend.type || 'application/octet-stream',
          name: originalFileName,
        };
        
        const base64 = await FileSystem.readAsStringAsync(fileObj.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        response = await api.post(`/chats/${chatroomId}/messages`, {
          content: contentToSend,
          messageType: 'file',
          fileData: {
            base64: base64,
            name: fileObj.name,
            type: fileObj.type,
          }
        });
      } else {
        response = await api.post(`/chats/${chatroomId}/messages`, {
          content: contentToSend
        });
      }

      console.log('📥 File Server response:', response.data);
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        
        const optimisticMsg = prev.find(msg => msg._id === tempId);
        
        const messageExists = filteredMessages.some(msg => {
          if (msg._id === response.data._id) return true;
          
          if (fileToSend && msg.fileName && msg.sender?._id === currentUser?._id) {
            const timeDiff = Math.abs(new Date(msg.timestamp) - new Date(response.data.timestamp));
            if (msg.fileName === (response.data.fileName || optimisticMsg?.fileName) && timeDiff < 5000) {
              return true;
            }
          }
          
          return false;
        });
        
        if (messageExists) {
          console.log('🔄 Server message already exists from socket, skipping...');
          return filteredMessages;
        }
        
        const serverMessage = { 
          ...response.data, 
          isOptimistic: false,
          messageType: (response.data.fileUrl || optimisticMsg?.fileName) ? 'file' : response.data.messageType,
          fileName: response.data.fileName || optimisticMsg?.fileName,
          fileSize: response.data.fileSize || optimisticMsg?.fileSize,
          mimeType: response.data.mimeType || optimisticMsg?.mimeType,
        };
        
        const updatedMessages = [...filteredMessages, serverMessage];
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          
          // Show time for sent message automatically after 500ms
          setTimeout(() => {
            if (serverMessage._id) {
              toggleTimeDisplay(serverMessage._id);
            }
          }, 500);
        }, 100);
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
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

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

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const pickImage = async () => {
    try {
      setShowAttachmentMenu(false);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
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
        image: {
          uri: imageAsset.uri,
          file_path: imageAsset.uri
        },
        user_id: currentUser,
        isOptimistic: true,
        isRead: false
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
        type: imageAsset.mimeType || imageAsset.type || 'image/jpeg', 
        name: fileName,
      };
      
      const base64 = await FileSystem.readAsStringAsync(fileObject.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await api.post(`/chats/${chatroomId}/messages`, {
        content: 'รูปภาพ',
        messageType: 'image',
        fileData: {
          base64: base64,
          name: fileObject.name,
          type: fileObject.type,
        }
      });

      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        
        const optimisticMsg = prev.find(msg => msg._id === tempId);
        
        const messageExists = filteredMessages.some(msg => {
          if (msg._id === response.data._id) return true;
          
          if (imageAsset && msg.messageType === 'image' && msg.sender?._id === currentUser?._id) {
            const timeDiff = Math.abs(new Date(msg.timestamp) - new Date(response.data.timestamp));
            if (timeDiff < 5000) {
              return true;
            }
          }
          
          return false;
        });
        
        if (messageExists) {
          console.log('🔄 Server image message already exists from socket, skipping...');
          return filteredMessages;
        }
        
        const serverMessage = { 
          ...response.data, 
          isOptimistic: false,
          messageType: (response.data.fileUrl || optimisticMsg?.image) ? 'image' : response.data.messageType,
          image: response.data.fileUrl ? undefined : optimisticMsg?.image,
        };
        
        const updatedMessages = [...filteredMessages, serverMessage];
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          
          // Show time for sent image automatically after 500ms
          setTimeout(() => {
            if (serverMessage._id) {
              toggleTimeDisplay(serverMessage._id);
            }
          }, 500);
        }, 100);
        
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
        errorMessage = error.response?.data?.message || error.message || errorMessage;
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
      return newSet;
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ฟังก์ชันสำหรับจัดกลุ่มข้อความตามวัน
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    const grouped = [];
    let currentDate = null;
    
    messages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      // ถ้าเป็นวันใหม่ ให้เพิ่ม date separator
      if (messageDate !== currentDate) {
        grouped.push({
          type: 'date_separator',
          date: message.timestamp,
          _id: `date_${messageDate}_${index}`
        });
        currentDate = messageDate;
      }
      
      grouped.push(message);
    });
    
    return grouped;
  };

  // ฟังก์ชันสำหรับแสดงวันที่แบบสั้น
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

  const decodeFileName = (fileName) => {
    if (!fileName) return 'ไฟล์แนบ';
    
    try {
      const decoded = decodeURIComponent(fileName);
      return decoded;
    } catch (error) {
      return fileName;
    }
  };

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
        Alert.alert('ข้อผิดพลาด', 'ต้องการสิทธิ์ในการเข้าถึงไฟล์เพื่อบันทึกรูปภาพ');
        return;
      }

      // ปิด modal ก่อน
      setImageModalVisible(false);

      const timestamp = new Date().getTime();
      const fileName = `image_${timestamp}.jpg`;

      // สำหรับ Cloudinary URL ลองใช้วิธีตรง
      if (selectedModalImage.includes('cloudinary.com')) {
        console.log('🌤️ Attempting direct Cloudinary download...');
        
        try {
          // ลองใช้ MediaLibrary.createAssetAsync โดยตรงจาก URL
          const asset = await MediaLibrary.createAssetAsync(selectedModalImage);
          
          // รอให้ Modal ปิดก่อน แล้วค่อยแสดงการแจ้งเตือน
          setTimeout(() => {
            showSuccessNotification(
              `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${fileName}`
            );
          }, 300);
          
          console.log('✅ Image saved to gallery directly:', asset);
          return; // สำเร็จแล้ว ออกจาก function
          
        } catch (directError) {
          console.log('⚠️ Direct download failed, trying temp file method:', directError.message);
          // ถ้าไม่ได้ ให้ fallback ไปใช้วิธี temp file
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
        console.log('✅ Download successful, saving to gallery...');
        
        // บันทึกไปที่ MediaLibrary (Gallery/Photos)
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        
        // ลบไฟล์ชั่วคราว
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        
        // รอให้ Modal ปิดก่อน แล้วค่อยแสดงการแจ้งเตือน
        setTimeout(() => {
          showSuccessNotification(
            `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${fileName}`
          );
        }, 300);
        
        console.log('✅ Image saved to gallery:', asset);
      } else {
        console.error('❌ Download failed with status:', downloadResult.status);
        throw new Error(`HTTP ${downloadResult.status}`);
      }

    } catch (error) {
      console.error('❌ Error downloading image from modal:', error);
      console.error('Error details:', {
        url: selectedModalImage,
        error: error.message
      });
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถดาวน์โหลดรูปภาพได้: ${error.message}`);
    }
  };

  const previewFile = async (file) => {
    // Implementation will be added
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
              const asset = await MediaLibrary.createAssetAsync(fullUrl);
              
              // แสดงการแจ้งเตือนที่หายไปเอง
              showSuccessNotification(
                isImage ? 
                  `รูปภาพถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}` : 
                  `วิดีโอถูกบันทึกไปที่แกลเลอรี่แล้ว\nชื่อไฟล์: ${finalFileName}`
              );
              
              console.log('✅ Media saved to gallery directly:', asset);
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

  const showFileOptions = (fileUrl, fileName) => {
    Alert.alert(
      'ไฟล์แนบ',
      `ชื่อไฟล์: ${fileName || 'ไม่ทราบชื่อ'}`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ดาวน์โหลด', 
          onPress: () => downloadFile(fileUrl, fileName || `file_${Date.now()}`)
        }
      ]
    );
  };

  const handleDeleteMessage = async (messageId) => {
    // Implementation will be added
  };

  const editMessage = (message) => {
    // Implementation will be added
  };

  // Header functions
  const handleGoBack = () => {
    navigation.navigate('Chat', { 
      chatId: route.params?.returnChatId || route.params?.chatroomId 
    });
  };

  const handleManageChat = () => {
    console.log('🔄 PrivateChat: Activating selection mode');
    console.log('📱 Current selectionMode:', selectionMode);
    setSelectionMode(true);
    console.log('📱 After setSelectionMode(true)');
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessages([]);
  };

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
                  await api.delete(`/chats/${chatroomId}/messages/${messageId}`);
                  console.log(`✅ Deleted message ${messageId} from server`);
                  
                  // Emit socket event for real-time deletion
                  if (socket) {
                    socket.emit('deleteMessage', {
                      messageId: messageId,
                      chatroomId: chatroomId,
                      userId: currentUser._id
                    });
                  }
                } catch (error) {
                  console.error(`❌ Failed to delete message ${messageId}:`, error);
                  throw error;
                }
              });

              await Promise.all(deletePromises);
              console.log(`✅ Successfully deleted ${messagesToDelete.length} messages from server`);
              
            } catch (error) {
              console.error('❌ Error deleting messages:', error);
              
              // หากเกิดข้อผิดพลาด ให้โหลดข้อความใหม่เพื่อซิงค์กับ server
              Alert.alert(
                'ข้อผิดพลาด', 
                'ไม่สามารถลบข้อความได้ กำลังโหลดข้อความใหม่...',
                [
                  {
                    text: 'ตกลง',
                    onPress: () => {
                      // Reload messages from server
                      loadMessages(1, true);
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

  // Handle message selection
  const handleMessagePress = (messageId) => {
    if (!messageId || messageId.startsWith('date_')) return;
    
    if (selectionMode) {
      // Selection mode - ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
      const message = messages.find(msg => msg._id === messageId);
      if (!message) return;
      
      // ตรวจสอบว่าเป็นข้อความของผู้ส่งปัจจุบันหรือไม่
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
        return; // กดไม่ได้เลย
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
      // ถ้าไม่ใช่ข้อความของตัวเอง ไม่ทำอะไร
    }
  };

  // Render date separator
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

  // Render message function
  const renderMessage = useCallback(({ item, index }) => {
    // ถ้าเป็น date separator
    if (item.type === 'date_separator') {
      return renderDateSeparator(item.date);
    }

    // สำหรับข้อความปกติ
    return (
      <ChatMessage
        item={item}
        index={index}
        currentUser={currentUser}
        recipientAvatar={recipientAvatar}
        recipientName={recipientName}
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
  }, [currentUser, recipientAvatar, recipientName, showTimeForMessages, timeAnimations, selectionMode, selectedMessages, handleMessagePress, handleLongPress]);

  return (
    <View style={styles.container}>
      {/* แสดง Loading หรือเนื้อหา */}
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
        {/* Header */}
        <ChatHeader
          recipientName={recipientName}
          recipientAvatar={recipientAvatar}
          roomName={roomName}
          selectionMode={selectionMode}
          selectedMessages={selectedMessages}
          onBackPress={handleGoBack}
          onManageChat={handleManageChat}
          onCancelSelection={handleCancelSelection}
          onDeleteSelected={deleteSelectedMessages}
        />

        {/* Selection Mode Banner */}
        {selectionMode && (
          <View style={styles.selectionBanner}>
            <Text style={styles.selectionText}>
              โหมดเลือกข้อความ - กดที่ข้อความเพื่อเลือก ({selectedMessages.length} เลือกแล้ว)
            </Text>
          </View>
        )}

        {/* Messages List */}
        <View style={styles.messagesContainer}>
          {messages.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={groupMessagesByDate(messages)}
              keyExtractor={(item, index) => item._id || `${item._id}_${index}`}
              renderItem={renderMessage}
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"

              inverted={false}

              onContentSizeChange={(contentWidth, contentHeight) => {
                if (!hasScrolledToEnd && messages.length > 0 && !isLoadingMore) {
                  console.log('📏 Content size changed, scrolling to bottom');
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
              onLayout={(event) => {
                if (!hasScrolledToEnd && messages.length > 0 && !isLoadingMore) {
                  console.log('🎨 FlatList layout complete, scrolling to bottom');
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
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - 50;
                const isNearTop = contentOffset.y < 200;
                
                setShowScrollToBottom(!isAtBottom && messages.length > 10);
                
                // แสดงปุ่มโหลดข้อความเก่าเมื่อเลื่อนขึ้นไป
                const actualMessageCount = messages.filter(msg => msg.type !== 'date_separator').length;
                setShowLoadOlderButton(isNearTop && canLoadMore && !isLoadingMore && actualMessageCount >= 30);
              }}
              scrollEventThrottle={16}
              ListHeaderComponent={() => (
                showLoadOlderButton ? (
                  <LoadOlderMessagesPrivateChat
                    visible={true}
                    isLoading={isLoadingMore}
                    canLoadMore={canLoadMore}
                    onLoadMore={loadMoreMessages}
                    messagesCount={messages.filter(msg => msg.type !== 'date_separator').length}
                    style={styles.loadOlderInList}
                  />
                ) : null
              )}
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
          ) : (
            <View style={styles.emptyMessageContainer}>
              <Text style={styles.emptyMessageText}>
                ยังไม่มีข้อความในแชทนี้
              </Text>
              <Text style={styles.emptyMessageSubText}>
                เริ่มต้นการสนทนาได้เลย!
              </Text>
            </View>
          )}
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

        {/* Input Bar */}
        <ChatInputBar
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          selectedFile={selectedFile}
          isSending={isSending}
          showAttachmentMenu={showAttachmentMenu}
          setShowAttachmentMenu={setShowAttachmentMenu}
          onSendMessage={sendMessage}
          onPickImage={pickImage}
          onPickFile={pickFile}
          onRemoveFile={removeSelectedFile}
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
                  <Text style={styles.modalDownloadText}>📥 ดาวน์โหลด</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setImageModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
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

      </KeyboardAvoidingView>
      )}
      
      {/* Success Notification */}
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
  loadOlderComponent: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent'
  },
  loadOlderInList: {
    marginTop: 5,
    backgroundColor: 'transparent'
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'transparent'
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
  // Animation Styles
  animationContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg
  },
  animationTouchable: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatAnimation: {
    width: 300,
    height: 300
  },
  skipHintText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontWeight: '500'
  },

});

export default PrivateChatScreen;