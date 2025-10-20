import React, { useState, useEffect, useCallback } from 'react';
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
  const [showTimeForMessages, setShowTimeForMessages] = useState(new Set());
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
  useEffect(() => {
    if (currentUser && chatroomId) {
      console.log('🚀 Loading initial 30 messages and scrolling to latest');
      loadMessages(1, false);
      setHasScrolledToEnd(false);
      setCurrentPage(1);
    }
  }, [currentUser, chatroomId]);

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
          const response = await api.get(`/chat/${chatroomId}/check-new?lastId=${messages[0]?._id}`);
          
          if (response.data.newMessages && response.data.newMessages.length > 0) {
            console.log('📨 New messages detected, adding to existing list...');
            
            // เพิ่มข้อความใหม่เข้าไปโดยไม่รีเฟรช
            setMessages(prev => [...response.data.newMessages, ...prev]);
            
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
      const response = await api.get(`/chat/${chatroomId}/messages?page=${page}&limit=30`);
      
      if (refresh || page === 1) {
        setMessages(response.data.messages || []);
      } else {
        setMessages(prev => [...prev, ...(response.data.messages || [])]);
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
      
      const response = await api.get(`/chat/${chatroomId}/messages?limit=30&page=${nextPage}`);
      const olderMessages = response.data.messages || [];
      
      if (olderMessages.length < 30) {
        setCanLoadMore(false);
      }
      
      if (olderMessages.length > 0) {
        setMessages(prev => [...prev, ...olderMessages]);
        setCurrentPage(nextPage);
      }
      
    } catch (error) {
      console.error('Error loading more messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความเก่าได้');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, canLoadMore, currentPage, chatroomId]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() && !selectedFile && !selectedImage) return;
    if (!currentUser || !chatroomId) return;

    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      content: newMessage.trim(),
      sender: {
        _id: currentUser._id,
        username: currentUser.username,
        avatar: currentUser.avatar
      },
      timestamp: new Date().toISOString(),
      type: selectedFile ? 'file' : selectedImage ? 'image' : 'text',
      status: 'sending' // แสดงสถานะกำลังส่ง
    };

    // เพิ่มข้อความทันที (Optimistic Update)
    setMessages(prev => [optimisticMessage, ...prev]);
    
    // เคลียร์ input ทันที
    const messageContent = newMessage.trim();
    setNewMessage('');
    setSelectedFile(null);
    setSelectedImage(null);

    // Auto scroll
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('content', messageContent);
      formData.append('sender_id', currentUser._id);

      if (selectedFile) {
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType,
          name: selectedFile.name
        });
      }

      if (selectedImage) {
        formData.append('image', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'image.jpg'
        });
      }

      const response = await api.post(`/chat/${chatroomId}/send`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // อัปเดตข้อความที่ส่งสำเร็จ
      setMessages(prev => prev.map(msg => 
        msg._id === tempId 
          ? { ...response.data.message, status: 'sent' }
          : msg
      ));

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // แสดงข้อความ error และลบข้อความที่ส่งไม่สำเร็จ
      setMessages(prev => prev.map(msg => 
        msg._id === tempId 
          ? { ...msg, status: 'failed' }
          : msg
      ));
      
      Alert.alert('Error', 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่');
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedFile, selectedImage, currentUser, chatroomId]);

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
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
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
        message.sender?._id === currentUser._id ||
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
        message.sender?._id === currentUser._id ||
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
              for (const messageId of selectedMessages) {
                await deleteMessage(messageId);
              }
              
              // Remove deleted messages from state
              setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg._id)));
              setSelectionMode(false);
              setSelectedMessages([]);
              
              Alert.alert('สำเร็จ', 'ลบข้อความแล้ว');
            } catch (error) {
              console.error('Error deleting messages:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
            }
          }
        }
      ]
    );
  };

  const renderMessage = useCallback(({ item }) => {
    return (
      <ChatMessage
        message={item}
        currentUser={currentUser}
        onPress={() => handleMessagePress(item._id)}
        onLongPress={() => handleLongPress(item._id)}
        showTime={showTimeForMessages.has(item._id)}
        isSelected={selectedMessages.includes(item._id)}
        showStatus={true} // แสดงสถานะการส่ง
      />
    );
  }, [currentUser, showTimeForMessages, selectedMessages]);

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
  }
});

export default PrivateChatScreen;