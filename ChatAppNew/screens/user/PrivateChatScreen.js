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
  Linking
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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const flatListRef = React.useRef(null); // เพิ่ม ref สำหรับ FlatList

  // ข้อมูลแชทจาก route params
  const { chatroomId, roomName, recipientId, recipientName, recipientAvatar } = route.params || {};

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && chatroomId) {
      loadMessages();
    }
  }, [currentUser, chatroomId]);

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
      socket.on('messageRead', handleMessageRead); // เพิ่ม listener สำหรับ message read

      // Cleanup
      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
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
    try {
      console.log('Loading messages for chatroom:', chatroomId);
      const response = await api.get(`/chats/${chatroomId}/messages`);
      const loadedMessages = response.data.messages || [];
      setMessages(loadedMessages);
      
      // มาร์คข้อความว่าอ่านแล้ว
      await api.put(`/chats/${chatroomId}/read`);
      
      // ส่ง socket event เพื่อแจ้งว่าได้อ่านข้อความแล้ว
      if (socket && chatroomId) {
        console.log('📖 Emitting messageRead event for chatroom:', chatroomId);
        socket.emit('messageRead', {
          chatroomId: chatroomId,
          userId: currentUser?._id
        });
      }
      
      // Scroll ไปข้อความล่าสุดเสมอ
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      
    } catch (error) {
      console.error('Error loading messages:', error);
      // ถ้า error ให้ fallback เป็น scrollToEnd
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
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

  const downloadFile = async (file) => {
    try {
      // แสดง loading
      Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
      
      const fileUrl = `${API_URL}${file.url || file.file_path}`;
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
      const fileUrl = `${API_URL}${file.url || file.file_path}`;
      console.log('👁️ Previewing file:', fileUrl);
      await Linking.openURL(fileUrl);
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

  const renderMessage = useCallback(({ item }) => {
    const isMyMessage = item.sender._id === currentUser._id;
    
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
    
    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}
        onLongPress={isMyMessage ? handleDeleteMessageConfirm : null}
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
            <View style={[
              styles.imageMessageBubble,
              isMyMessage ? styles.myImageBubble : styles.otherImageBubble,
              item.isOptimistic && styles.optimisticMessage
            ]}>
              <TouchableOpacity style={styles.imageContainer}>
                <Image
                  source={{ 
                    uri: item.image?.file_path || 
                         item.image?.uri ||
                         (item.file ? `${API_URL}${item.file.url || item.file.file_path}` : '') 
                  }}
                  style={styles.messageImage}
                  resizeMode="cover"
                  onError={() => console.log('❌ Error loading image:', item.file?.url || item.image?.file_path)}
                />
              </TouchableOpacity>
              <View style={styles.imageTimeContainer}>
                <Text style={[
                  styles.imageMessageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                  {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                </Text>
                {isMyMessage && !item.isOptimistic && (
                  <Text style={[styles.readStatus, styles.imageReadStatus]}>
                    {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* แสดงข้อความในกรอบแยก (ถ้ามีข้อความและไม่ใช่ default) */}
          {item.content && item.content !== 'รูปภาพ' && item.content !== 'ไฟล์แนบ' && (
            <View>
              {/* ข้อมูลข้อความอยู่ข้างหน้ากล่อง */}
              <View style={[
                styles.messageInfoContainer,
                isMyMessage ? styles.myMessageInfo : styles.otherMessageInfo
              ]}>
                <Text style={[
                  styles.messageTimeExternal,
                  isMyMessage ? styles.myMessageTimeExternal : styles.otherMessageTimeExternal
                ]}>
                  {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                </Text>
                {isMyMessage && !item.isOptimistic && (
                  <Text style={[
                    styles.readStatusExternal,
                    isMyMessage ? styles.myReadStatusExternal : styles.otherReadStatusExternal
                  ]}>
                    {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                  </Text>
                )}
              </View>
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
              </View>
            </View>
          )}

          {/* แสดงไฟล์ถ้ามี (ที่ไม่ใช่รูปภาพ) - แบบไม่มีกรอบ */}
          {item.file && !(item.file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name)) && (
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
                    {item.file.file_name}
                  </Text>
                  <Text style={[
                    styles.fileSize,
                    { color: isMyMessage ? "rgba(255,255,255,0.8)" : "#666" }
                  ]}>
                    {formatFileSize(item.file.size)}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.fileTimeContainer}>
                <Text style={[
                  styles.fileMessageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                  {item.isOptimistic ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
                </Text>
                {isMyMessage && !item.isOptimistic && (
                  <Text style={[styles.readStatus, styles.fileReadStatus, 
                    { color: isMyMessage ? "rgba(255,255,255,0.8)" : "#666" }
                  ]}>
                    {item.isRead ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [currentUser, recipientAvatar, recipientName]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={12}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
          onContentSizeChange={() => {
            // Auto scroll เมื่อ content size เปลี่ยน (มีข้อความใหม่)
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            setShowScrollToBottom(!isAtBottom);
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
    padding: 16
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
    maxWidth: '75%', // ลดความกว้างลงเพื่อไม่ให้ข้อความยาวเกินไป
    padding: 12,
    borderRadius: 12, // เปลี่ยนจาก 18 เป็น 12 เพื่อให้เป็นสี่เหลี่ยมมนๆ
    backgroundColor: '#fff', // กล่องข้อความเป็นสีขาว
    flexShrink: 1, // ให้กล่องข้อความปรับขนาดตามเนื้อหา
  },
  myMessageBubble: {
    backgroundColor: '#fff', // ข้อความของตัวเองก็เป็นสีขาว
    borderBottomRightRadius: 12 // ปรับให้สม่ำเสมอ
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
    width: '100%',
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
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 4,
  },
  
  // Separate Message Containers
  messageContentContainer: {
    maxWidth: '80%', // ลดความกว้างลง
    alignItems: 'flex-end', // Default for sender
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
});

export default PrivateChatScreen;
