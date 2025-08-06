import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api, { API_URL, deleteMessage } from '../../service/api';
import { useSocket } from '../../context/SocketContext';

const PrivateChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, leaveChatroom } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrollingToEnd, setIsScrollingToEnd] = useState(false); // Loading สำหรับการ scroll ไปข้อความล่าสุด
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false); // Track ว่า scroll ไปข้อความล่าสุดแล้วหรือยัง
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
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
  const { chatroomId, roomName, recipientId, recipientName, recipientAvatar } = route.params || {};

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && chatroomId) {
      // Reset scroll flags เมื่อเข้าแชทใหม่
      setHasScrolledToEnd(false);
      setIsScrollingToEnd(true);
      loadMessages();
    }
  }, [currentUser, chatroomId]);

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

  // Socket.IO listeners
  useEffect(() => {
    if (socket && chatroomId && currentUser) { // เพิ่ม currentUser เป็นเงื่อนไข
      console.log('🔌 Setting up socket listeners for private chat:', chatroomId);
      console.log('👤 Current user loaded:', currentUser._id);
      console.log('🔌 Socket connected:', socket.connected);
      console.log('🔌 Socket ID:', socket.id);
      
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

  const loadCurrentUser = async () => {
    try {
      console.log('PrivateChatScreen: Loading current user...');
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await api.get('/users/current');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
      if (error.response?.status === 401) {
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = useCallback(async () => {
    let loadedMessages = [];
    try {
      console.log('Loading messages for chatroom:', chatroomId);
      
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
      
      // Debug: ตรวจสอบ isRead status ของข้อความที่โหลดมา
      console.log('📨 Messages loaded with read status:');
      
      if (loadedMessages.length === 0) {
        console.log('📨 No messages found - this is a new chat');
        setMessages([]); // ตั้งค่าเป็น array ว่าง
      } else {
        loadedMessages.forEach((msg, index) => {
          const isMyMessage = msg.sender._id === currentUser?._id;
          console.log(`Message ${index + 1}:`, {
            id: msg._id?.substring(msg._id.length - 4),
            content: msg.content.substring(0, 20) + '...',
            sender: msg.sender.firstName,
            isMyMessage: isMyMessage,
            isRead: msg.isRead,
            senderId: msg.sender._id,
            currentUserId: currentUser?._id
          });
          
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
      
      console.log('📨 Messages set, total:', loadedMessages.length);
      
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
            console.log('📖 Emitting messageRead event for chatroom:', chatroomId);
            socket.emit('messageRead', {
              chatroomId: chatroomId,
              userId: currentUser?._id
            });
          }
        } catch (readError) {
          console.warn('⚠️ Failed to mark messages as read:', readError.message);
        }
      } else {
        console.log('📨 No messages to mark as read - this is a new chat');
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
        console.log('📨 Setting empty messages due to error - allowing chat to display');
        setMessages([]);
      }
    } finally {
      setIsLoading(false); // ต้องตั้งเป็น false เสมอ ไม่ว่าจะมีข้อความหรือไม่
    }
  }, [chatroomId, currentUser, socket]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile && !selectedImage) || !chatroomId || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}_${currentUser._id}`;
    
    // กำหนดประเภทข้อความ
    let messageType = 'text';
    let displayContent = messageToSend;
    
    if (selectedImage) {
      messageType = 'image';
      displayContent = displayContent || 'รูปภาพ';
    } else if (selectedFile) {
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
      image: selectedImage ? {
        file_name: selectedImage.fileName || 'image.jpg',
        file_path: selectedImage.uri,
        uri: selectedImage.uri,
        size: selectedImage.fileSize
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
    const imageToSend = selectedImage;
    setSelectedFile(null);
    setSelectedImage(null);

    try {
      const formData = new FormData();
      
      // ส่งข้อความ หรือ default text สำหรับรูป/ไฟล์
      const contentToSend = messageToSend || (imageToSend ? 'รูปภาพ' : (fileToSend ? 'ไฟล์แนบ' : ''));
      formData.append('content', contentToSend);
      
      if (imageToSend) {
        console.log('📷 Sending image:', imageToSend);
        formData.append('file', {
          uri: imageToSend.uri,
          type: imageToSend.mimeType || 'image/jpeg',
          name: imageToSend.fileName || `image_${Date.now()}.jpg`
        });
      } else if (fileToSend) {
        console.log('📎 Sending file:', fileToSend);
        formData.append('file', {
          uri: fileToSend.uri,
          type: fileToSend.mimeType || fileToSend.type || 'application/octet-stream',
          name: fileToSend.name || fileToSend.fileName || `file_${Date.now()}`
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
      setSelectedImage(imageToSend); // คืนรูปภาพ
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
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

  // ฟังก์ชันเปิดรูปภาพในโหมดเต็มจอ
  const openImageModal = (imageUri) => {
    setSelectedModalImage(imageUri);
    setImageModalVisible(true);
  };

  // ฟังก์ชันดาวน์โหลดรูปภาพจาก modal
  const downloadImageFromModal = async () => {
    if (!selectedModalImage) return;
    
    try {
      Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
      
      const fileName = `image_${Date.now()}.jpg`;
      
      console.log('📥 Starting image download:', selectedModalImage);
      
      const downloadResult = await FileSystem.downloadAsync(
        selectedModalImage,
        FileSystem.documentDirectory + fileName
      );
      
      console.log('✅ Image download completed:', downloadResult.uri);
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `บันทึกรูปภาพ: ${fileName}`
        });
      } else {
        Alert.alert(
          'ดาวน์โหลดเรียบร้อย',
          `รูปภาพถูกบันทึกที่: ${downloadResult.uri}`,
          [{ text: 'ตกลง', style: 'default' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดรูปภาพได้');
    }
  };

  const downloadFile = async (file) => {
    try {
      // แสดง loading
      Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
      
      // ตรวจสอบ URL ให้ถูกต้อง
      let fileUrl;
      if (file.url && file.url.startsWith('http')) {
        fileUrl = file.url; // ใช้ URL เต็มจาก Cloudinary
      } else {
        fileUrl = `${API_URL}${file.url || file.file_path}`; // สร้าง URL จาก API_URL
      }
      
      const fileName = file.file_name || 'downloaded_file';
      
      console.log('📥 Starting download:', fileUrl);
      
      // ดาวน์โหลดไฟล์ไปยัง temporary directory
      const downloadResult = await FileSystem.downloadAsync(
        fileUrl,
        FileSystem.documentDirectory + fileName
      );
      
      console.log('✅ Download completed:', downloadResult.uri);
      
      // ตรวจสอบว่าสามารถแชร์ไฟล์ได้หรือไม่
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // ใช้ Sharing API เพื่อเปิดไฟล์หรือแชร์
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: file.mimeType || 'application/octet-stream',
          dialogTitle: `เปิดไฟล์: ${fileName}`
        });
      } else {
        // ถ้าไม่สามารถแชร์ได้ ให้แสดงข้อมูลไฟล์
        Alert.alert(
          'ไฟล์ดาวน์โหลดเรียบร้อย',
          `ชื่อไฟล์: ${fileName}\nขนาด: ${formatFileSize(file.size)}\nที่เก็บ: ${downloadResult.uri}`,
          [
            { text: 'ตกลง', style: 'default' },
            { 
              text: 'คัดลอกที่อยู่', 
              onPress: () => {
                // คัดลอก path ไปยัง clipboard (ถ้าต้องการ)
                console.log('File path:', downloadResult.uri);
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      
      // ถ้าดาวน์โหลดไม่ได้ ลองเปิด URL ใน browser
      try {
        const fileUrl = `${API_URL}${file.url || file.file_path}`;
        const canOpen = await Linking.canOpenURL(fileUrl);
        
        if (canOpen) {
          Alert.alert(
            'ไม่สามารถดาวน์โหลดได้',
            'คุณต้องการเปิดไฟล์ในเบราว์เซอร์หรือไม่?',
            [
              { text: 'ยกเลิก', style: 'cancel' },
              { 
                text: 'เปิด', 
                onPress: () => Linking.openURL(fileUrl)
              }
            ]
          );
        } else {
          Alert.alert(
            'ข้อผิดพลาด',
            `ไม่สามารถดาวน์โหลดไฟล์ได้\nชื่อไฟล์: ${file.file_name}\nขนาด: ${formatFileSize(file.size)}`
          );
        }
      } catch (linkError) {
        Alert.alert(
          'ข้อผิดพลาด',
          `ไม่สามารถเข้าถึงไฟล์ได้\nชื่อไฟล์: ${file.file_name}\nขนาด: ${formatFileSize(file.size)}`
        );
      }
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
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
        onLongPress={isMyMessage ? handleDeleteMessageConfirm : null}
        onPress={handleMessagePress}
        delayLongPress={500}
      >
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
                defaultSource={require('../../assets/default-avatar.png')}
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
                item.isOptimistic && styles.optimisticMessage
              ]}>
                <TouchableOpacity 
                  style={styles.imageContainer}
                  onPress={() => {
                    const imageUri = item.image?.file_path || 
                                    item.image?.uri ||
                                    (item.file && item.file.url && item.file.url.startsWith('http') ? 
                                      item.file.url : 
                                      (item.file ? `${API_URL}${item.file.url || item.file.file_path}` : ''));
                    openImageModal(imageUri);
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
                      console.log('❌ Error loading image:', item.file?.url || item.image?.file_path, error.nativeEvent.error);
                      // ลองใช้ default image หรือซ่อนรูป
                    }}
                    defaultSource={require('../../assets/default-avatar.png')}
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
                (item.image || (item.file && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name))) && styles.messageWithMedia
              ]}>
                <Text style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                  item.isOptimistic && styles.optimisticMessageText
                ]}>
                  {item.content}
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
                item.isOptimistic && styles.optimisticMessage
              ]}>
                <TouchableOpacity 
                  style={[
                    styles.fileAttachment,
                    isMyMessage ? styles.myFileAttachment : styles.otherFileAttachment
                  ]}
                  onPress={() => showFileOptions(item.file)}
                >
                  <View style={styles.fileIcon}>
                    <Text style={styles.attachIcon}>📎</Text>
                  </View>
                  <View style={styles.fileDetails}>
                    <Text style={[
                      styles.fileName,
                      { color: isMyMessage ? "#fff" : "#333" }
                    ]} numberOfLines={2}>
                      {item.file.file_name || 'ไฟล์แนบ'}
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
  }, [currentUser, recipientAvatar, recipientName, messages, showTimeForMessages, timeAnimations]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลดข้อความ...</Text>
        <Text style={styles.loadingSubText}>กรุณารอสักครู่</Text>
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
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.scrollLoadingText}>กำลังไปที่ข้อความล่าสุด...</Text>
        </View>
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {recipientAvatar ? (
            <Image
              source={{ 
                uri: recipientAvatar.startsWith('http') 
                  ? recipientAvatar 
                  : `${API_URL}/${recipientAvatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
              }}
              style={styles.headerAvatar}
              defaultSource={require('../../assets/default-avatar.png')}
            />
          ) : (
            <View style={[styles.headerAvatar, styles.defaultAvatar]}>
              <Text style={styles.headerAvatarText}>
                {recipientName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          
          <View style={styles.headerTextInfo}>
            <Text style={styles.headerName}>
              {recipientName || roomName || 'แชทส่วนตัว'}
            </Text>
            <Text style={styles.headerStatus}>ออนไลน์</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {/* สำหรับปุ่มเพิ่มเติมในอนาคต */}
        </View>
      </View>

      {/* รายการข้อความ */}
      <TouchableOpacity 
        style={styles.messagesListContainer}
        activeOpacity={1}
        onPress={() => setShowAttachmentMenu(false)}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => {
            // สร้าง unique key เพื่อป้องกัน duplicate
            if (item._id) {
              return `${item._id}_${item.timestamp || Date.now()}_${index}`;
            }
            return `message_${index}_${item.timestamp || Date.now()}_${item.sender?._id || 'unknown'}`;
          }}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContainer,
            messages.length === 0 && styles.emptyMessagesContainer // เพิ่ม style เมื่อไม่มีข้อความ
          ]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
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
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            setShowScrollToBottom(!isAtBottom);
          }}
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
          scrollEventThrottle={16}
        />
      </TouchableOpacity>

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

      {/* Input สำหรับพิมพ์ข้อความ */}
      <View style={styles.inputContainer}>
        {/* แสดงรูปภาพที่เลือก */}
        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
            <TouchableOpacity 
              onPress={removeSelectedImage}
              style={styles.removeImageButton}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* แสดงไฟล์ที่เลือก */}
        {selectedFile && (
          <View style={styles.selectedFileContainer}>
            <View style={styles.fileInfo}>
              <Text style={styles.attachIcon}>📎</Text>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile.name || selectedFile.fileName || 'ไฟล์ที่เลือก'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={removeSelectedFile}
              style={styles.removeFileButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <View style={styles.attachmentMenu}>
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={pickImage}
            >
              <Text style={styles.attachmentMenuIcon}>🖼️</Text>
              <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={pickFile}
            >
              <Text style={styles.attachmentMenuIcon}>📎</Text>
              <Text style={styles.attachmentMenuText}>ไฟล์</Text>
            </TouchableOpacity>
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
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="แนบไฟล์"
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
            style={styles.sendTextButton}
            onPress={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile && !selectedImage) || isSending}
          >
            <Text style={styles.sendTextLabel}>ส่ง</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseArea}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              
              {selectedModalImage && (
                <Image
                  source={{ uri: selectedModalImage }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
              
              <TouchableOpacity 
                style={styles.modalDownloadButton}
                onPress={downloadImageFromModal}
              >
                <Text style={styles.modalDownloadText}>📥 ดาวน์โหลด</Text>
              </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#F5C842' // สีเหลืองเหมือนในรูป
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5C842'
  },
  loadingText: {
    color: '#333',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  loadingSubText: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  scrollLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5C842',
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
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
    borderBottomWidth: 0, // เอาเส้นขอบล่างออก
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  backIcon: {
    fontSize: 20,
    color: '#007AFF',
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
    marginRight: 12
  },
  defaultAvatar: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666'
  },
  headerTextInfo: {
    flex: 1
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerStatus: {
    fontSize: 12,
    color: '#4CAF50'
  },
  headerActions: {
    width: 40
  },

  // Messages Styles
  messagesListContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F5C842' // เปลี่ยนเป็นสีเหลือง
  },
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
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end'
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
    width: 32,
    height: 32,
    borderRadius: 16
  },
  defaultMessageAvatar: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
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
    backgroundColor: '#fff', // ข้อความของตัวเองก็เป็นสีขาว
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
    flexShrink: 1, // ให้ข้อความปรับขนาดได้
  },
  myMessageText: {
    color: '#333' // เปลี่ยนเป็นสีเทาเข้ม เพราะพื้นหลังเป็นสีขาว
  },
  otherMessageText: {
    color: '#333'
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
    paddingTop: 8,
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
    borderTopWidth: 0, // เอาเส้นขอบบนออก
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
    backgroundColor: '#FFA500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  plusIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 4,
  },
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
    backgroundColor: '#FFA500',
  },
  sendTextLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
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
    zIndex: 1000,
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  attachmentMenuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  attachmentMenuText: {
    fontSize: 16,
    color: '#333',
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
    bottom: 80,
    right: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollToBottomIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Image Styles
  selectedImageContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imagePreview: {
    flex: 1,
    marginRight: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    padding: 4,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageContainer: {
    marginTop: 4,
    position: 'relative',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 4,
  },
  
  // Separate Message Containers
  messageContentContainer: {
    flex: 1, // ให้ใช้พื้นที่เต็มที่
    maxWidth: '85%', // กำหนดความกว้างสูงสุด
  },
  
  // Image Message Bubble
  imageMessageBubble: {
    padding: 4,
    borderRadius: 18,
    marginBottom: 4,
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
});

export default PrivateChatScreen;
