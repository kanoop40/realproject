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

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import api, { API_URL, deleteMessage } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import TypingIndicator from '../../components/TypingIndicator';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import ChatMessage from '../../components_user/ChatMessage';
import ChatInputBar from '../../components_user/ChatInputBar';
import ChatHeader from '../../components_user/ChatHeader';
import LoadOlderMessagesPrivateChat from '../../components_user/LoadOlderMessagesPrivateChat';
import LoadingOverlay from '../../components/LoadingOverlay';
import SuccessTickAnimation from '../../components/SuccessTickAnimation';
import FullscreenImageViewer from '../../components/FullscreenImageViewer';
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
  
  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [fullscreenImageVisible, setFullscreenImageVisible] = useState(false);
  const [fullscreenImageUri, setFullscreenImageUri] = useState(null);
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

  // Typing indicator functions
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      // ส่งสถานะ typing ไปยังเซิร์ฟเวอร์ (HTTP polling approach)
      sendTypingStatus(true);
    }
    
    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // หยุด typing หลังจาก 2 วินาที (เร็วขึ้น)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  }, [isTyping, chatroomId]);

  const sendTypingStatus = useCallback(async (typing) => {
    try {
      console.log(`📝 Sending typing status: ${typing ? 'เริ่มพิม' : 'หยุดพิม'}`);
      await api.post(`/chats/${chatroomId}/typing`, { 
        isTyping: typing
      });
      console.log(`✅ Typing status sent: ${typing}`);
    } catch (error) {
      console.log('❌ Failed to send typing status:', error.message);
    }
  }, [chatroomId]);

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
    }
  }, [currentUser, chatroomId]);

  // Auto-scroll ไปข้อความล่าสุดเมื่อมีข้อความใหม่ (ทำงานในพื้นหลังระหว่างโหลด) - GroupChat Style
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToEnd) {
      // รอให้ FlatList render เสร็จแล้วค่อย scroll (ไม่ต้องรอ loading เสร็จ)
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
        };
        requestAnimationFrame(scrollToEnd);
      }, 100); // ลดเวลา delay เหลือ 100ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, hasScrolledToEnd]); // ไม่ใส่ isLoading ใน dependency

  // เพิ่ม useEffect เพื่อ scroll ทันทีเมื่อมี messages (ไม่รอ loading) - GroupChat Style
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

  // เพิ่ม useEffect เพื่อ force scroll หลังจาก component mount และมีข้อความ - GroupChat Style
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



  // Monitor selectionMode changes for debugging if needed
  useEffect(() => {
    // Force re-render เมื่อ selectionMode เปลี่ยน (เพื่อให้แน่ใจว่า UI อัปเดต)
    if (selectionMode) {
      setMessages(prev => [...prev]);
    }
  }, [selectionMode, selectedMessages]);

  // Adaptive Background Sync with Rate Limiting Protection
  useEffect(() => {
    let backgroundSync;
    let currentInterval = 800; // เริ่มต้น 0.8 วินาที (เร็วมาก!)
    let consecutiveFailures = 0;
    let isActive = true;
    
    const performSync = async () => {
      if (!isActive) return;
      
      try {
        // เช็คข้อความใหม่และสถานะ typing
        const [messagesResponse, typingResponse] = await Promise.all([
          api.get(`/chats/${chatroomId}/messages?page=1&limit=5`),
          api.get(`/chats/${chatroomId}/typing`).catch(() => ({ data: { data: { users: [] } } }))
        ]);
        
        const latestMessages = messagesResponse.data.messages || [];
        const typingUsers = typingResponse.data?.data?.users || [];
        
        // อัปเดตสถานะ typing ของผู้ใช้อื่น
        const wasTyping = otherUserTyping;
        const isNowTyping = typingUsers.length > 0;
        
        setOtherUserTyping(isNowTyping);
        if (isNowTyping) {
          console.log(`👀 Users typing: ${typingUsers.map(u => u.firstName || u.username).join(', ')}`);
          
          // Scroll เมื่อมี typing indicator ใหม่แสดงขึ้นมา (GroupChat Style)
          if (!wasTyping && !showScrollToBottom) {
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
                console.error('Error scrolling for typing indicator:', error);
                // Fallback to scrollToEnd if scrollToIndex fails
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }
            }, 200);
          }
        }
        
        // Reset failures on success
        consecutiveFailures = 0;
        
        // เช็คข้อความใหม่โดยเปรียบเทียบทุกข้อความจากเซิร์ฟเวอร์
        console.log('🔍 Checking for new messages...');
        console.log('📊 Local messages:', messages.length, 'Server messages:', latestMessages.length);
        
        // กรองเฉพาะข้อความใหม่ที่ยังไม่มีในระบบท้องถิ่น
        const newMessages = latestMessages.filter(serverMsg => {
          const exists = messages.some(localMsg => localMsg._id === serverMsg._id);
          if (!exists) {
            console.log('🆕 Found new message:', serverMsg._id, serverMsg.content?.substring(0, 50));
          }
          return !exists;
        });
        
        const hasNewMessages = newMessages.length > 0;
        
        if (hasNewMessages) {
          console.log('📨 New messages detected:', newMessages.length, 'messages, increasing sync frequency...');
          currentInterval = Math.max(500, currentInterval * 0.7); // เร็วขึ้นเมื่อมีกิจกรรม (0.5 วินาทีขั้นต่ำ)
          
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
          setMessages(prev => {
            // ตรวจสอบซ้ำอีกครั้งก่อนเพิ่ม
            const trulyNewMessages = safeNewMessages.filter(newMsg => 
              !prev.some(existingMsg => existingMsg._id === newMsg._id)
            );
            
            if (trulyNewMessages.length === 0) {
              console.log('⚠️ No truly new messages after duplicate check');
              return prev;
            }
            
            const updated = [...prev, ...trulyNewMessages];
            console.log('✅ Added new messages to chat. New:', trulyNewMessages.length, 'Total:', updated.length);
            return updated;
          });
          
          // Auto scroll เฉพาะถ้าผู้ใช้อยู่ใกล้ล่างสุด (ไม่รบกวนเมื่อกำลังดูข้อความเก่า) - GroupChat Style
          if (!showScrollToBottom && trulyNewMessages.length > 0) {
            setTimeout(() => {
              try {
                setMessages(currentMessages => {
                  if (currentMessages.length > 0) {
                    flatListRef.current?.scrollToIndex({ 
                      index: currentMessages.length - 1, 
                      animated: false,
                      viewPosition: 1
                    });
                  }
                  return currentMessages;
                });
              } catch (error) {
                console.error('Error scrolling to synced message:', error);
                // Fallback to scrollToEnd if scrollToIndex fails
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }
            }, 100);
          }
        } else {
          // ไม่มีข้อความใหม่ - ช้าลงแต่ไม่มาก
          console.log('😴 No new messages found, slowing down sync...');
          currentInterval = Math.min(2000, currentInterval * 1.1); // ช้าลงน้อยกว่าเดิม (2 วินาทีสูงสุด)
        }
        
        console.log(`⏱️ Next sync in ${currentInterval/1000}s`);
        
      } catch (error) {
        consecutiveFailures++;
        
        if (error.response?.status === 429) {
          // Rate limiting - exponential backoff
          currentInterval = Math.min(30000, currentInterval * 2);
          console.log(`⚠️ Rate limited - backing off to ${currentInterval/1000}s interval`);
        } else {
          console.log('🔄 Background sync failed:', error.message);
        }
        
        // หยุดชั่วคราวถ้าล้มเหลวติดต่อกัน
        if (consecutiveFailures >= 3) {
          currentInterval = Math.min(15000, currentInterval * 1.5);
          console.log('🚫 Multiple sync failures - reducing frequency');
        }
      }
      
      // Schedule next sync with adaptive interval
      if (isActive) {
        backgroundSync = setTimeout(performSync, currentInterval);
      }
    };
    
    if (currentUser && chatroomId) {
      console.log('🔄 Starting adaptive background sync...');
      performSync(); // เริ่มทันที
    }

    return () => {
      isActive = false;
      if (backgroundSync) {
        clearTimeout(backgroundSync);
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

  // Socket event handlers for real-time chat
  const handleNewMessage = useCallback((newMessage) => {
    console.log('📨 New message received via socket:', {
      messageId: newMessage._id || newMessage.id,
      chatroomId: newMessage.chatroomId || newMessage.chatroom,
      currentChatroomId: chatroomId,
      sender: newMessage.sender?.firstName || newMessage.senderName,
      content: newMessage.content?.substring(0, 50)
    });
    
    // ตรวจสอบว่าข้อความเป็นของ chatroom นี้
    const messageChatroomId = newMessage.chatroomId || newMessage.chatroom || newMessage.room;
    if (messageChatroomId === chatroomId) {
      // ตรวจสอบว่าข้อความไม่ซ้ำกับที่มีอยู่แล้ว
      setMessages(prev => {
        const messageId = newMessage._id || newMessage.id;
        const exists = prev.some(msg => msg._id === messageId);
        if (exists) {
          console.log('⚠️ Message already exists, skipping');
          return prev;
        }
        
        // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่ (เพื่อไม่ให้ duplicate)
        const isMyMessage = (newMessage.sender?._id || newMessage.sender_id) === currentUser?._id;
        if (isMyMessage) {
          console.log('⚠️ Skipping my own message from socket to avoid duplicate');
          return prev;
        }
        
        console.log('✅ Adding new message from socket to chat');
        
        // สร้างข้อความที่ปลอดภัย
        const safeMessage = {
          ...newMessage,
          _id: messageId,
          sender: newMessage.sender || { 
            _id: newMessage.sender_id || 'unknown',
            firstName: newMessage.senderName || 'Unknown User',
            lastName: '',
            username: newMessage.senderName || 'unknown'
          },
          timestamp: newMessage.timestamp || newMessage.createdAt || new Date().toISOString(),
          messageType: newMessage.messageType || 'text',
          // แก้ไขข้อมูลรูปภาพ
          image: newMessage.messageType === 'image' ? (newMessage.image || newMessage.fileUrl) : undefined
        };
        
        const updatedMessages = [...prev, safeMessage];
        
        // Auto scroll to new message (GroupChat Style)
        setTimeout(() => {
          try {
            if (updatedMessages.length > 0) {
              flatListRef.current?.scrollToIndex({ 
                index: updatedMessages.length - 1, 
                animated: false,
                viewPosition: 1
              });
            }
          } catch (error) {
            console.error('Error scrolling to new message:', error);
            // Fallback to scrollToEnd if scrollToIndex fails
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }, 100);
        
        return updatedMessages;
      });
    } else {
      console.log('⚠️ Message not for this chatroom:', {
        messageChatroomId,
        currentChatroomId: chatroomId
      });
    }
  }, [chatroomId, currentUser]);

  const handleMessageDeleted = useCallback((deletedData) => {
    console.log('🗑️ Message deleted via socket:', deletedData);
    
    const messageId = deletedData.messageId || deletedData._id || deletedData.id;
    
    setMessages(prev => {
      const filtered = prev.filter(msg => msg._id !== messageId);
      console.log(`✅ Removed message ${messageId} from chat`);
      return filtered;
    });
  }, []);

  // HTTP-only mode: No socket listeners needed
  useEffect(() => {
    if (!chatroomId) return;
    
    console.log('� HTTP-only mode: Using background sync instead of socket listeners for chat:', chatroomId);
    console.log('🔄 Real-time updates provided by 1-second background polling');
    
    // No socket setup needed - background sync handles message updates
    return () => {
      console.log('� HTTP-only mode: No socket cleanup needed');
    };
  }, [chatroomId]);

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
            
            // แก้ไขข้อมูลรูปภาพที่ไม่มี image field
            let processedMsg = {
              ...msg,
              sender: safeSender, // Always provide a valid sender object
              sender_id: msg.sender_id || (msg.sender?._id) || null,
              user_id: msg.user_id || (msg.sender?._id) || null
            };
            
            // แก้ไข image messages ที่ไม่มี image field
            if (processedMsg.messageType === 'image' && !processedMsg.image) {
              const imageUrl = processedMsg.fileUrl || processedMsg.file_url || (processedMsg.file?.url);
              if (imageUrl) {
                processedMsg.image = imageUrl;
                console.log('🔧 Fixed image field for old message:', processedMsg._id, 'URL:', imageUrl);
              }
            }
            
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
      
      // Auto scroll to latest message (GroupChat Style) - Always scroll when loading page 1
      if (page === 1) {
        console.log('🎯 Auto-scrolling to latest message...');
        
        // Force scroll to bottom หลังโหลดข้อความครั้งแรก (GroupChat Style)
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
            
            // แก้ไขข้อมูลรูปภาพที่ไม่มี image field
            let processedMsg = {
              ...msg,
              sender: safeSender,
              sender_id: msg.sender_id || (msg.sender?._id) || null,
              user_id: msg.user_id || (msg.sender?._id) || null
            };
            
            // แก้ไข image messages ที่ไม่มี image field
            if (processedMsg.messageType === 'image' && !processedMsg.image) {
              const imageUrl = processedMsg.fileUrl || processedMsg.file_url || (processedMsg.file?.url);
              if (imageUrl) {
                processedMsg.image = imageUrl;
                console.log('🔧 Fixed image field for old message:', processedMsg._id, 'URL:', imageUrl);
              }
            }
            
            return processedMsg;
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
      // เลื่อนไปข้อความล่าสุดทันทีหลังส่งข้อความ (GroupChat Style)
      setTimeout(() => {
        try {
          if (newMessages.length > 0) {
            flatListRef.current?.scrollToIndex({ 
              index: newMessages.length - 1, 
              animated: false,
              viewPosition: 1
            });
          }
        } catch (error) {
          console.error('Error scrolling to sent message:', error);
          // Fallback to scrollToEnd if scrollToIndex fails
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
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
        // Debug: ตรวจสอบข้อมูลไฟล์ก่อนส่ง
        console.log('🔍 File to send details:', {
          uri: fileToSend.uri,
          name: fileToSend.name || fileToSend.fileName,
          type: fileToSend.mimeType || fileToSend.type,
          size: fileToSend.size || fileToSend.fileSize,
          allProperties: Object.keys(fileToSend)
        });
        
        // ตรวจสอบว่าไฟล์มี uri หรือไม่
        if (!fileToSend.uri) {
          console.error('❌ File has no URI - cannot upload');
          throw new Error('ไฟล์ไม่มีข้อมูล URI สำหรับการอัปโหลด');
        }
        
        console.log('📤 Attempting to send file with proper FormData formatting');
        console.log('🔧 CODE VERSION: Updated with base64 method');
        
        try {
          const fileName = fileToSend.name || fileToSend.fileName || 'file.txt';
          const fileType = fileToSend.mimeType || fileToSend.type || 'application/octet-stream';
          
          console.log('📋 File upload details:', {
            content: contentToSend,
            messageType: messageType,
            fileName: fileName,
            fileType: fileType,
            fileUri: fileToSend.uri,
            fileSize: fileToSend.size
          });

          // วิธีที่ 1: ลอง base64 encoding
          console.log('📤 Trying base64 encoding method...');
          
          const base64 = await FileSystem.readAsStringAsync(fileToSend.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('� Base64 length:', base64.length);
          
          response = await api.post(`/chats/${chatroomId}/messages`, {
            content: contentToSend,
            messageType: messageType,
            fileName: fileName,
            fileType: fileType,
            fileSize: fileToSend.size,
            fileData: base64
          }, {
            timeout: 120000, // 2 นาที
          });
          
          console.log('✅ File sent successfully via base64');
          
        } catch (base64Error) {
          console.log('❌ Base64 failed, trying FormData:', base64Error.message);
          
          try {
            // วิธีที่ 2: FormData แบบไม่กำหนด Content-Type
            const formData = new FormData();
            formData.append('content', contentToSend);
            formData.append('messageType', messageType);
            
            formData.append('file', {
              uri: fileToSend.uri,
              type: fileType,
              name: fileName
            });
            
            console.log('📤 Trying FormData without Content-Type...');
            
            response = await api.post(`/chats/${chatroomId}/messages`, formData, {
              timeout: 120000,
              // ไม่กำหนด Content-Type ให้ axios จัดการเอง
            });
            
            console.log('✅ File sent successfully via FormData');
            
          } catch (formError) {
            console.log('❌ All methods failed, sending as text:', formError.message);
            
            // สุดท้าย ถ้าทุกอย่างล้มเหลว ให้ส่งเป็น text message
            response = await api.post(`/chats/${chatroomId}/messages`, {
              content: contentToSend + ' [ไฟล์: ' + (fileToSend.name || fileToSend.fileName || 'unknown') + ']',
              sender_id: currentUser._id,
              messageType: 'text'
            });
            
            console.log('✅ Sent as text message instead of file');
          }
        }
      } else {
        response = await api.post(`/chats/${chatroomId}/messages`, {
          content: contentToSend,
          sender_id: currentUser._id
        });
      }

      console.log('📥 File Server response:', response.data);
      
      // แก้ไข: ข้อมูลจริงอยู่ใน response.data.message หรือ response.data
      const actualMessageData = response.data.message || response.data;
      
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        const optimisticMsg = prev.find(msg => msg._id === tempId);
        
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
        
        // ตรวจสอบว่า actualMessageData มี _id ที่ถูกต้องหรือไม่
        if (!actualMessageData._id) {
          console.log('❌ Invalid message data - no _id found, keeping temp message');
          return prev; // คืนค่า messages เดิมรวมทั้ง temp message
        }

        // ตรวจสอบว่า message นี้มีอยู่แล้วหรือไม่
        const messageExists = filteredMessages.some(msg => msg._id === actualMessageData._id);
        if (messageExists) {
          console.log('⚠️ Message already exists, skipping duplicate');
          return filteredMessages;
        }
        
        const serverMessage = { 
          ...actualMessageData, 
          isTemporary: false,
          messageType: (actualMessageData.fileUrl || optimisticMsg?.fileName) ? messageType : actualMessageData.messageType,
          fileName: actualMessageData.fileName || optimisticMsg?.fileName,
          fileSize: actualMessageData.fileSize || optimisticMsg?.fileSize,
          mimeType: actualMessageData.mimeType || optimisticMsg?.mimeType,
          sender: actualMessageData.sender || currentUser,
          timestamp: actualMessageData.timestamp || actualMessageData.createdAt,
          fileUrl: actualMessageData.fileUrl || actualMessageData.file_url,
          file: actualMessageData.file || (actualMessageData.fileName ? {
            name: actualMessageData.fileName,
            size: actualMessageData.fileSize,
            type: actualMessageData.mimeType
          } : null),
          user_id: actualMessageData.user_id || actualMessageData.sender,
          isOptimistic: false,
        };
        
        const updatedMessages = [...filteredMessages, serverMessage];
        
        // เลื่อนไปข้อความล่าสุดหลังจากได้รับตอบกลับจากเซิร์ฟเวอร์ (GroupChat Style)
        setTimeout(() => {
          try {
            if (updatedMessages.length > 0) {
              flatListRef.current?.scrollToIndex({ 
                index: updatedMessages.length - 1, 
                animated: false,
                viewPosition: 1
              });
            }
          } catch (error) {
            console.error('Error scrolling to server message:', error);
            // Fallback to scrollToEnd if scrollToIndex fails
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }, 150);
        
        return updatedMessages;
      });
      
      console.log('✅ Message sent successfully:', response.data._id);
      
      // HTTP-only approach: Skip immediate check to avoid rate limiting
      console.log('📡 HTTP-only mode: Message sent via API, adaptive sync will handle delivery confirmation');
      
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
    if (!chatroomId || isSending || !currentUser) return;
    
    setIsSending(true);
    const tempId = `temp_image_${Date.now()}_${Math.random()}_${currentUser._id}`;
    
    try {
      console.log('📸 Starting image upload:', imageAsset.uri);

      // สร้าง optimistic message
      const optimisticMessage = {
        _id: tempId,
        content: 'รูปภาพ',
        sender: currentUser,
        timestamp: new Date().toISOString(),
        messageType: 'image',
        fileUrl: imageAsset.uri, // ใช้ local URI ก่อน
        image: imageAsset.uri, // เพิ่ม image field สำหรับ ImageMessage
        fileName: imageAsset.fileName || imageAsset.filename || `image_${Date.now()}.jpg`,
        fileSize: imageAsset.fileSize || 0,
        mimeType: imageAsset.mimeType || imageAsset.type || 'image/jpeg',
        user_id: currentUser._id,
        isTemporary: true,
        isOptimistic: true // เพิ่ม flag สำหรับ ImageMessage
      };

      // เพิ่ม optimistic message และ scroll
      setMessages(prev => {
        const newMessages = [...prev, optimisticMessage];
        // Auto scroll to image message (GroupChat Style)
        setTimeout(() => {
          try {
            if (newMessages.length > 0) {
              flatListRef.current?.scrollToIndex({ 
                index: newMessages.length - 1, 
                animated: false,
                viewPosition: 1
              });
            }
          } catch (error) {
            console.error('Error scrolling to image message:', error);
            // Fallback to scrollToEnd if scrollToIndex fails
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
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
        
        if (!base64 || base64.length === 0) {
          throw new Error('Base64 encoding returned empty string');
        }
      } catch (fileError) {
        console.error('❌ Error reading image as base64:', fileError);
        throw new Error(`Failed to read image: ${fileError.message}`);
      }

      // ส่งไปยัง server (ใช้รูปแบบเดียวกับ GroupChat)
      const response = await api.post(`/chats/${chatroomId}/messages`, {
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
        
        // ตรวจสอบว่า response เป็น object หรือ string
        if (typeof response.data === 'string') {
          console.log('⚠️ Server returned string instead of message object, keeping optimistic message');
          return prev.map(msg => 
            msg._id === tempId 
              ? { ...msg, isTemporary: false, sent: true }
              : msg
          );
        }
        
        const filteredMessages = prev.filter(msg => msg._id !== tempId);
        
        // ใช้ข้อมูลจาก response.data หรือ response.data.message
        const serverMessage = response.data.message || response.data;
        console.log('� Server message data:', serverMessage);
        
        if (!serverMessage || !serverMessage._id) {
          console.log('⚠️ Invalid server message data, keeping optimistic message');
          return prev.map(msg => 
            msg._id === tempId 
              ? { ...msg, isTemporary: false, sent: true }
              : msg
          );
        }
        
        // เพิ่มข้อความใหม่จาก server (ใช้ messageType เดิมจากเซิร์ฟเวอร์)
        console.log('🔄 PrivateChat using server messageType:', {
          fileName: serverMessage.fileName,
          fileUrl: serverMessage.fileUrl,
          messageType: serverMessage.messageType
        });
        
        const updatedMessages = [...filteredMessages, {
          ...serverMessage,
          messageType: serverMessage.messageType, // ใช้ messageType เดิมจากเซิร์ฟเวอร์
          isTemporary: false
        }];
        
        console.log('📋 Updated messages count:', updatedMessages.length);
        
        // Auto scroll to updated image message (GroupChat Style)
        setTimeout(() => {
          try {
            if (updatedMessages.length > 0) {
              flatListRef.current?.scrollToIndex({ 
                index: updatedMessages.length - 1, 
                animated: false,
                viewPosition: 1
              });
            }
          } catch (error) {
            console.error('Error scrolling to updated message:', error);
            // Fallback to scrollToEnd if scrollToIndex fails
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }, 100);
        
        return updatedMessages;
      });

      // HTTP-only approach: Skip immediate check to avoid rate limiting  
      console.log('📡 HTTP-only mode: Image sent via API, adaptive sync will handle delivery confirmation');

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
    console.log('🔍 getFileIcon called with:', fileName);
    if (!fileName) {
      console.log('⚠️ No fileName provided, returning FILE icon');
      return <Text style={{ fontSize: 12, color: "#666", fontWeight: 'bold' }}>FILE</Text>;
    }
    
    // Fix: Handle already encoded filenames from backend
    let decodedName;
    try {
      // Check if already encoded (contains %)
      if (fileName.includes('%')) {
        decodedName = decodeURIComponent(fileName);
        console.log('🔧 Decoded URL-encoded fileName:', fileName, '→', decodedName);
      } else {
        decodedName = decodeFileName(fileName);
      }
    } catch (error) {
      console.log('⚠️ Error decoding fileName:', error, 'using original:', fileName);
      decodedName = fileName;
    }
    
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
      default:
        return <Text style={{ fontSize: 12, color: "#666", fontWeight: 'bold' }}>FILE</Text>;
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
              
              setShowSuccessAnimation(true);
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
    
    // Debug message types
    if (item.messageType === 'image') {
      console.log('🖼️ Rendering IMAGE message:', {
        id: item._id,
        hasImage: !!item.image,
        hasFileUrl: !!item.fileUrl,
        fileName: item.fileName
      });
    } else if (item.messageType === 'file') {
      console.log('📁 Rendering FILE message:', {
        id: item._id,
        fileName: item.fileName,
        content: item.content
      });
    }
    
    return (
      <ChatMessage
        key={`chat-msg-${item._id || item.id || index}-${index}`}
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
        onFilePress={(fileData) => {
          console.log('📁 Direct download called with:', fileData);
          const fileUrl = fileData?.url || fileData?.fileUrl || fileData?.file_path;
          const fileName = fileData?.fileName || fileData?.file_name || 'downloaded_file';
          
          if (fileUrl) {
            downloadFile(fileUrl, fileName);
          } else {
            showFileOptions(fileData);
          }
        }}
        formatDateTime={formatDateTime}
        shouldShowTime={(messageId) => showTimeForMessages.has(messageId)}
        getFileIcon={getFileIcon}
        decodeFileName={decodeFileName}
        formatFileSize={formatFileSize}
      />
    );
  }, [currentUser, selectedMessages, showTimeForMessages, selectionMode]); // Added selectionMode for proper re-render

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
          _id: `date_${messageDate.replace(/\s/g, '_')}_${Date.now()}_${index}`
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
    console.log('🖼️ Opening fullscreen image viewer:', imageUri);
    setFullscreenImageUri(imageUri);
    setFullscreenImageVisible(true);
  };

  const closeFullscreenImage = () => {
    setFullscreenImageVisible(false);
    setTimeout(() => {
      setFullscreenImageUri(null);
    }, 300); // หน่วงเวลาให้ animation เสร็จก่อน
  };

  // ฟังก์ชันดาวน์โหลดรูปภาพจาก Modal
  const downloadImageFromModal = async () => {
    if (!fullscreenImageUri) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบรูปภาพที่จะดาวน์โหลด');
      return;
    }

    try {
      console.log('📥 Starting image download from modal...');
      console.log('🖼️ Image URL:', fullscreenImageUri);
      
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
          const downloadResult = await FileSystem.downloadAsync(fullscreenImageUri, tempUri, {});
          
          if (downloadResult.status === 200) {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(downloadResult.uri, {
                mimeType: 'image/*',
                dialogTitle: 'บันทึกรูปภาพ'
              });
              console.log('✅ Image shared successfully');
            } else {
              setShowSuccessAnimation(true);
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
      setFullscreenImageVisible(false);

      const timestamp = new Date().getTime();
      const fileName = `image_${timestamp}.jpg`;

      // สำหรับ Cloudinary URL ลองใช้วิธีตรง
      if (fullscreenImageUri.includes('cloudinary.com')) {
        try {
          console.log('🌤️ Trying direct Cloudinary save...');
          const asset = await MediaLibrary.saveToLibraryAsync(fullscreenImageUri);
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
      const headers = fullscreenImageUri.includes('cloudinary.com') ? {} : { Authorization: `Bearer ${token}` };
      
      const tempUri = `${FileSystem.documentDirectory}temp_${timestamp}_${fileName}`;
      
      console.log('📍 Temp file path:', tempUri);
      console.log('🔄 Starting download with headers:', headers);
      
      const downloadResult = await FileSystem.downloadAsync(fullscreenImageUri, tempUri, {
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
        fullscreenImageUri: fullscreenImageUri,
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
                setShowSuccessAnimation(true);
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

  const showFileOptions = (fileData) => {
    console.log('🔧 showFileOptions called with:', fileData);
    
    // Extract data from fileData object
    const fileUrl = fileData?.url || fileData?.fileUrl || fileData?.file_path;
    const fileName = fileData?.fileName || fileData?.file_name || 'ไม่ทราบชื่อ';
    
    console.log('📁 File details:', { fileUrl, fileName });
    
    if (!fileUrl) {
      Alert.alert(
        'ไฟล์ไม่พร้อมใช้งาน',
        `ไฟล์ "${fileName}" ถูกส่งเป็นข้อความเนื่องจากการอัปโหลดล้มเหลว\n\nกรุณาลองส่งไฟล์ใหม่อีกครั้ง`,
        [{ text: 'ตกลง', style: 'default' }]
      );
      return;
    }
    
    Alert.alert(
      'ไฟล์แนบ',
      `ชื่อไฟล์: ${fileName}`,
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
            keyExtractor={(item, index) => {
              if (item.type === 'date_separator') {
                return `date_${item.date}_${index}`;
              }
              return `msg_${item._id || item.id || index}_${index}`;
            }}
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
            ListFooterComponent={() => (
              <TypingIndicator 
                isVisible={otherUserTyping} 
                userName={recipientName || 'Someone'} 
              />
            )}
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
            onContentSizeChange={(contentWidth, contentHeight) => {
              // Auto-scroll ไปข้อความล่าสุดเฉพาะเมื่อมีข้อความใหม่ (ไม่ใช่เมื่อแสดง/ซ่อน timestamp) - GroupChat Style
              if (messages.length > 0 && !hasScrolledToEnd && !isLoadingMore) {
                console.log('📏 Private Chat - Content size changed, scrolling to end due to new messages. Messages:', messages.length);
                // หลายครั้งเพื่อให้แน่ใจ - เหมือน GroupChat
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
              // เมื่อ FlatList layout เสร็จ - scroll เฉพาะเมื่อยังไม่เคย scroll (ระหว่างโหลด) - GroupChat Style
              if (messages.length > 0 && !hasScrolledToEnd && !isLoadingMore) {
                console.log('📐 Private Chat - FlatList layout complete, scrolling to end due to initial load');
                // หลายครั้งเพื่อให้แน่ใจ - เหมือน GroupChat
                [20, 100, 200, 400].forEach((delay) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, delay);
                });
                
                setTimeout(() => {
                  setHasScrolledToEnd(true);
                }, 500);
              }
            }}
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
            onTypingStart={handleTypingStart}
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
                <Text style={{ fontSize: 16, color: "#333", fontWeight: 'bold' }}>📷</Text>
                <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.verticalAttachmentItem}
                onPress={() => {
                  pickFile();
                  setShowAttachmentMenu(false);
                }}
              >
                <Text style={{ fontSize: 16, color: "#333", fontWeight: 'bold' }}>📁</Text>
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
      

      
      {/* Success Tick Animation */}
      <SuccessTickAnimation
        visible={showSuccessAnimation}
        onComplete={handleSuccessAnimationComplete}
      />

      {/* Fullscreen Image Viewer */}
      <FullscreenImageViewer
        visible={fullscreenImageVisible}
        imageUri={fullscreenImageUri}
        onClose={closeFullscreenImage}
        onDownload={downloadImageFromModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff'
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
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
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
    backgroundColor: '#007AFF',
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