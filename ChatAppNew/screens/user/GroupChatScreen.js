import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
  Haptics
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api, { API_URL } from '../../service/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GroupChatScreen = ({ route, navigation }) => {
  const { groupId, groupName, groupImage } = route.params;
  const { user: authUser } = useAuth();
  const { socket, joinChatroom } = useSocket();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    loadGroupInfo();
    loadMessages();
    
    // Join group room for real-time updates
    if (socket && groupId) {
      console.log('🏠 Joining group room:', groupId);
      joinChatroom(groupId);
    }
  }, [groupId, socket, joinChatroom]);

  // Socket listeners
  useEffect(() => {
    if (socket && groupId) {
      console.log('🔌 Setting up GroupChat socket listeners for group:', groupId);
      
      const handleNewMessage = (data) => {
        console.log('💬 GroupChat received new message:', data);
        console.log('👤 Message sender info:', {
          sender: data.message?.sender,
          senderId: data.message?.sender?._id,
          senderName: data.message?.sender?.firstName + ' ' + data.message?.sender?.lastName,
          senderAvatar: data.message?.sender?.avatar
        });
        if (data.chatroomId === groupId) {
          setMessages(prevMessages => [...prevMessages, data.message]);
          // Scroll to bottom when new message arrives
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };

      const handleMessageDeleted = (data) => {
        console.log('🗑️ Message deleted via socket:', data);
        
        if (data.chatroomId === groupId) {
          setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [socket, groupId]);

  const loadGroupInfo = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroupInfo(response.data.data);
      
      // Update navigation title
      navigation.setOptions({
        title: response.data.data.groupName
      });
    } catch (error) {
      console.error('Error loading group info:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลกลุ่มได้');
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/groups/${groupId}/messages`);
      console.log('📨 Loaded messages:', response.data.data?.length || 0);
      console.log('📨 Sample message sender:', response.data.data?.[0]?.sender);
      setMessages(response.data.data || []);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความได้');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Optimistic UI: Add message immediately
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      content: messageText,
      messageType: 'text',
      sender: authUser,
      timestamp: new Date().toISOString(),
      isTemporary: true,
      isSending: true
    };
    
    setMessages(prevMessages => [...prevMessages, tempMessage]);
    
    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const messageData = {
        content: messageText,
        groupId: groupId
      };

      console.log('📤 Sending group message:', messageData);
      const response = await api.post(`/groups/${groupId}/messages`, messageData);
      console.log('✅ Group message sent:', response.data);

      // Remove temporary message since real one will come via socket
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id !== tempMessage._id)
      );
    } catch (error) {
      console.error('❌ Error sending group message:', error);
      // Remove temporary message and restore input
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id !== tempMessage._id)
      );
      setInputText(messageText);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSending(false);
    }
  };

  // ฟังก์ชันส่งรูปภาพ
  const sendImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('ต้องการสิทธิ์', 'แอปต้องการสิทธิ์ในการเข้าถึงแกลเลอรี่');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7, // ลดขนาดเพื่อความเร็ว
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowAttachmentMenu(false);
        
        const asset = result.assets[0];
        
        // Optimistic UI for image
        const tempImageMessage = {
          _id: `temp_img_${Date.now()}`,
          content: '📷 รูปภาพ',
          messageType: 'image',
          sender: authUser,
          timestamp: new Date().toISOString(),
          fileUrl: asset.uri, // Use local URI for immediate display
          isTemporary: true,
          isSending: true
        };
        
        setMessages(prevMessages => [...prevMessages, tempImageMessage]);
        setIsUploadingFile(true);
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
        
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`,
        });
        formData.append('groupId', groupId);

        console.log('📤 Uploading image to group:', groupId);
        const response = await api.post(`/groups/${groupId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('✅ Image uploaded to group:', response.data);
        
        // Remove temporary message since real one will come via socket
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg._id !== tempImageMessage._id)
        );
      }
    } catch (error) {
      console.error('❌ Error sending image:', error);
      // Remove temporary message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id.startsWith('temp_img_'))
      );
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งรูปภาพได้');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ฟังก์ชันส่งไฟล์
  const sendFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingFile(true);
        setShowAttachmentMenu(false);
        
        const asset = result.assets[0];
        const formData = new FormData();
        
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name || `file_${Date.now()}`,
        });
        formData.append('groupId', groupId);

        console.log('📤 Uploading file to group:', groupId);
        const response = await api.post(`/groups/${groupId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('✅ File uploaded to group:', response.data);
      }
    } catch (error) {
      console.error('❌ Error sending file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งไฟล์ได้');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ฟังก์ชันถ่ายรูป
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('ต้องการสิทธิ์', 'แอปต้องการสิทธิ์ในการเข้าถึงกล้อง');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingFile(true);
        setShowAttachmentMenu(false);
        
        const asset = result.assets[0];
        const formData = new FormData();
        
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        });
        formData.append('groupId', groupId);

        console.log('📤 Uploading photo to group:', groupId);
        const response = await api.post(`/groups/${groupId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('✅ Photo uploaded to group:', response.data);
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ฟังก์ชันลบข้อความ
  const deleteMessage = async (messageId) => {
    try {
      Alert.alert(
        'ลบข้อความ',
        'คุณต้องการลบข้อความนี้หรือไม่?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: async () => {
              console.log('🗑️ Deleting message:', messageId);
              
              // Optimistic UI - ลบข้อความออกจาก state ทันที
              setMessages(prevMessages => 
                prevMessages.filter(msg => msg._id !== messageId)
              );
              
              try {
                const response = await api.delete(`/groups/${groupId}/messages/${messageId}`);
                console.log('✅ Message deleted:', response.data);
                
                // ส่ง socket event เพื่อแจ้งผู้อื่นว่าข้อความถูกลบ
                if (socket) {
                  socket.emit('message_deleted', {
                    chatroomId: groupId,
                    messageId,
                    deletedBy: authUser._id
                  });
                }
              } catch (error) {
                console.error('❌ Error deleting message:', error);
                // หาก error ให้โหลดข้อความใหม่เพื่อ restore state
                loadMessages();
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
              }
              
              setShowMessageActions(false);
              setSelectedMessage(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
    }
  };

  // ฟังก์ชันดาวน์โหลดไฟล์
  const downloadFile = async (fileUrl, fileName) => {
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const fullUrl = fileUrl.startsWith('http') 
        ? fileUrl 
        : `${API_URL}/${fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`;
      
      console.log('📥 Downloading file:', fullUrl);
      
      Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
      
      // ดาวน์โหลดไฟล์ไปยัง temporary directory
      const downloadResult = await FileSystem.downloadAsync(
        fullUrl,
        FileSystem.documentDirectory + (fileName || 'downloaded_file')
      );
      
      console.log('✅ Download completed:', downloadResult.uri);
      
      // ตรวจสอบว่าสามารถแชร์ไฟล์ได้หรือไม่
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // ใช้ Sharing API เพื่อเปิดไฟล์หรือแชร์
        await Sharing.shareAsync(downloadResult.uri, {
          dialogTitle: `เปิดไฟล์: ${fileName || 'ไฟล์ดาวน์โหลด'}`
        });
      } else {
        // ถ้าไม่สามารถแชร์ได้ ให้แสดงข้อมูลไฟล์
        Alert.alert(
          'ไฟล์ดาวน์โหลดเรียบร้อย',
          `ชื่อไฟล์: ${fileName || 'ไฟล์ดาวน์โหลด'}\nที่เก็บ: ${downloadResult.uri}`,
          [
            { text: 'ตกลง', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      
      // ถ้าดาวน์โหลดไม่ได้ ลองเปิด URL ใน browser
      try {
        const canOpen = await Linking.canOpenURL(fullUrl);
        
        if (canOpen) {
          Alert.alert(
            'ไม่สามารถดาวน์โหลดได้',
            'คุณต้องการเปิดไฟล์ในเบราว์เซอร์หรือไม่?',
            [
              { text: 'ยกเลิก', style: 'cancel' },
              { 
                text: 'เปิด', 
                onPress: () => Linking.openURL(fullUrl)
              }
            ]
          );
        } else {
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
        }
      } catch (linkError) {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเข้าถึงไฟล์ได้');
      }
    }
  };

  // ฟังก์ชันแสดงตัวอย่างไฟล์
  const previewFile = async (fileUrl, fileName) => {
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const fullUrl = fileUrl.startsWith('http') 
        ? fileUrl 
        : `${API_URL}/${fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`;
      
      console.log('👁️ Previewing file:', fullUrl);
      await Linking.openURL(fullUrl);
    } catch (error) {
      console.error('❌ Error previewing file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดูตัวอย่างไฟล์ได้');
    }
  };

  // ฟังก์ชันแสดงตัวเลือกสำหรับไฟล์
  const showFileOptions = (fileUrl, fileName) => {
    Alert.alert(
      'ตัวเลือกไฟล์',
      `จัดการไฟล์: ${fileName || 'ไฟล์'}`,
      [
        {
          text: 'ดูตัวอย่าง',
          onPress: () => previewFile(fileUrl, fileName)
        },
        {
          text: 'ดาวน์โหลด',
          onPress: () => downloadFile(fileUrl, fileName)
        },
        {
          text: 'ยกเลิก',
          style: 'cancel'
        }
      ]
    );
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

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender._id === authUser._id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMessage || 
      new Date(item.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}>
          {!isMyMessage && (
            <View style={styles.messageAvatarContainer}>
              <Image
                source={
                  item.sender.avatar
                    ? { 
                        uri: item.sender.avatar.startsWith('http') 
                          ? item.sender.avatar 
                          : `${API_URL}/${item.sender.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}`
                      }
                    : require('../../assets/default-avatar.png')
                }
                style={styles.messageAvatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            </View>
          )}
          
          <TouchableOpacity
            style={[
              styles.messageContentContainer,
              isMyMessage ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
            ]}
            onLongPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              setSelectedMessage(item);
              setShowMessageActions(true);
            }}
            delayLongPress={500}
          >
            {/* แสดงชื่อผู้ส่งสำหรับข้อความจากคนอื่น */}
            {!isMyMessage && (
              <Text style={styles.senderName}>
                {item.sender.firstName} {item.sender.lastName}
              </Text>
            )}
            
            {/* ข้อมูลข้อความอยู่ข้างหน้ากล่อง */}
            <View style={[
              styles.messageInfoContainer,
              isMyMessage ? styles.myMessageInfo : styles.otherMessageInfo
            ]}>
              <Text style={[
                styles.messageTimeExternal,
                isMyMessage ? styles.myMessageTimeExternal : styles.otherMessageTimeExternal
              ]}>
                {item.isTemporary ? 'กำลังส่ง...' : formatDateTime(item.timestamp)}
              </Text>
              {isMyMessage && !item.isTemporary && (
                <Text style={[
                  styles.readStatusExternal,
                  isMyMessage ? styles.myReadStatusExternal : styles.otherReadStatusExternal
                ]}>
                  ส่งแล้ว
                </Text>
              )}
            </View>
            
            <View style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
              item.isTemporary && styles.temporaryMessage
            ]}>
              {/* รูปภาพ */}
              {item.messageType === 'image' && item.fileUrl && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(item.fileUrl);
                    setShowImageViewer(true);
                  }}
                  onLongPress={() => {
                    if (Platform.OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setSelectedMessage(item);
                    setShowMessageActions(true);
                  }}
                  delayLongPress={500}
                >
                  <Image
                    source={{ 
                      uri: item.fileUrl.startsWith('http') 
                        ? item.fileUrl 
                        : `${API_URL}/${item.fileUrl.replace(/\\/g, '/').replace(/^\/+/, '')}`
                    }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                  {item.content !== '📷 รูปภาพ' && (
                    <Text style={[
                      styles.messageText,
                      isMyMessage ? styles.myMessageText : styles.otherMessageText
                    ]}>
                      {item.content}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              
              {/* ไฟล์ */}
              {item.messageType === 'file' && item.fileUrl && (
                <TouchableOpacity
                  style={styles.fileContainer}
                  onPress={() => showFileOptions(item.fileUrl, item.fileName || 'ไฟล์')}
                >
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>📎</Text>
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[
                      styles.fileName,
                      isMyMessage ? styles.myMessageText : styles.otherMessageText
                    ]}>
                      {item.fileName || 'ไฟล์'}
                    </Text>
                    {item.fileSize && (
                      <Text style={styles.fileSize}>
                        {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              
              {/* ข้อความธรรมดา */}
              {item.messageType === 'text' && (
                <View style={styles.textMessageContainer}>
                  <Text style={[
                    styles.messageText,
                    isMyMessage ? styles.myMessageText : styles.otherMessageText,
                    item.isTemporary && styles.temporaryText
                  ]}>
                    {item.content}
                  </Text>
                  {item.isSending && (
                    <ActivityIndicator 
                      size="small" 
                      color={isMyMessage ? "#FFA500" : "#666"} 
                      style={styles.sendingIndicator}
                    />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGroupInfoModal = () => (
    <Modal
      visible={showGroupInfo}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
            <Text style={styles.modalHeaderButton}>เสร็จ</Text>
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>ข้อมูลกลุ่ม</Text>
          <View style={styles.placeholder} />
        </View>

        {groupInfo && (
          <View style={styles.groupInfoContent}>
            <View style={styles.groupHeader}>
              <Image
                source={
                  groupInfo.groupImage
                    ? { uri: `${api.defaults.baseURL}/${groupInfo.groupImage.replace(/\\/g, '/')}` }
                    : require('../../assets/default-avatar.png')
                }
                style={styles.groupImage}
              />
              <Text style={styles.groupName}>{groupInfo.groupName}</Text>
              {groupInfo.description && (
                <Text style={styles.groupDescription}>{groupInfo.description}</Text>
              )}
            </View>

            <View style={styles.membersSection}>
              <Text style={styles.sectionTitle}>
                สมาชิก ({groupInfo.members?.length || 0} คน)
              </Text>
              <FlatList
                data={groupInfo.members}
                keyExtractor={(item) => item.user._id}
                renderItem={({ item }) => (
                  <View style={styles.memberItem}>
                    <Image
                      source={
                        item.user.avatar
                          ? { uri: `${api.defaults.baseURL}/${item.user.avatar.replace(/\\/g, '/')}` }
                          : require('../../assets/default-avatar.png')
                      }
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {item.user.firstName} {item.user.lastName}
                      </Text>
                      <Text style={styles.memberRole}>{item.role}</Text>
                    </View>
                  </View>
                )}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {groupInfo?.groupImage ? (
            <Image
              source={{ uri: `${API_URL}/${groupInfo.groupImage}` }}
              style={styles.headerAvatar}
              defaultSource={require('../../assets/default-avatar.png')}
            />
          ) : (
            <View style={[styles.headerAvatar, styles.defaultAvatar]}>
              <Text style={styles.headerAvatarText}>
                {groupName?.charAt(0)?.toUpperCase() || 'G'}
              </Text>
            </View>
          )}
          
          <View style={styles.headerTextInfo}>
            <Text style={styles.headerName}>
              {groupName}
            </Text>
            <Text style={styles.headerStatus}>
              {groupInfo?.members?.length || 0} สมาชิก
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => setShowGroupInfo(true)}
          style={styles.headerActions}
        >
          <Text style={styles.infoButton}>ℹ️</Text>
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
          keyExtractor={(item, index) => {
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
          maxToRenderPerBatch={20}
          windowSize={15}
          initialNumToRender={15}
          getItemLayout={(data, index) => ({
            length: 80, // ประมาณความสูงเฉลี่ยของข้อความ
            offset: 80 * index,
            index,
          })}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
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
            flatListRef.current?.scrollToEnd({ animated: true });
            setShowScrollToBottom(false);
          }}
        >
          <Text style={styles.scrollToBottomIcon}>↓</Text>
        </TouchableOpacity>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <View style={styles.attachmentMenu}>
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={sendImage}
              disabled={isUploadingFile}
            >
              <Text style={styles.attachmentMenuIcon}>🖼️</Text>
              <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={takePhoto}
              disabled={isUploadingFile}
            >
              <Text style={styles.attachmentMenuIcon}>📷</Text>
              <Text style={styles.attachmentMenuText}>ถ่ายรูป</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={sendFile}
              disabled={isUploadingFile}
            >
              <Text style={styles.attachmentMenuIcon}>📎</Text>
              <Text style={styles.attachmentMenuText}>ไฟล์</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.messageInputRow}>
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowAttachmentMenu(!showAttachmentMenu);
            }}
          >
            <Text style={styles.plusIcon}>+</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
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
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={styles.sendTextButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              sendMessage();
            }}
            disabled={!inputText.trim() || isSending}
          >
            <Text style={styles.sendTextLabel}>ส่ง</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderGroupInfoModal()}

      {/* Message Actions Modal */}
      <Modal
        visible={showMessageActions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMessageActions(false)}
      >
        <TouchableOpacity
          style={styles.messageActionsOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageActions(false)}
        >
          <View style={styles.messageActionsContainer}>
            <Text style={styles.messageActionsTitle}>จัดการข้อความ</Text>
            
            {selectedMessage && (
              <>
                {/* ตัวเลือกสำหรับรูปภาพ */}
                {selectedMessage.messageType === 'image' && (
                  <>
                    <TouchableOpacity
                      style={styles.messageActionItem}
                      onPress={() => {
                        setSelectedImage(selectedMessage.fileUrl);
                        setShowImageViewer(true);
                        setShowMessageActions(false);
                      }}
                    >
                      <Text style={styles.messageActionIcon}>👁️</Text>
                      <Text style={styles.messageActionText}>ดูรูปภาพ</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.messageActionItem}
                      onPress={() => {
                        downloadFile(selectedMessage.fileUrl, selectedMessage.fileName || 'image.jpg');
                        setShowMessageActions(false);
                      }}
                    >
                      <Text style={styles.messageActionIcon}>💾</Text>
                      <Text style={styles.messageActionText}>บันทึกรูปภาพ</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {/* ตัวเลือกสำหรับไฟล์ */}
                {selectedMessage.messageType === 'file' && (
                  <TouchableOpacity
                    style={styles.messageActionItem}
                    onPress={() => {
                      downloadFile(selectedMessage.fileUrl, selectedMessage.fileName);
                      setShowMessageActions(false);
                    }}
                  >
                    <Text style={styles.messageActionIcon}>📥</Text>
                    <Text style={styles.messageActionText}>ดาวน์โหลดไฟล์</Text>
                  </TouchableOpacity>
                )}
                
                {/* ตัวเลือกลบสำหรับข้อความของตัวเอง */}
                {selectedMessage.sender._id === authUser._id && !selectedMessage.isTemporary && (
                  <TouchableOpacity
                    style={[styles.messageActionItem, styles.deleteAction]}
                    onPress={() => {
                      deleteMessage(selectedMessage._id);
                    }}
                  >
                    <Text style={styles.messageActionIcon}>🗑️</Text>
                    <Text style={[styles.messageActionText, styles.deleteActionText]}>ลบข้อความ</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            
            <TouchableOpacity
              style={[styles.messageActionItem, styles.cancelAction]}
              onPress={() => setShowMessageActions(false)}
            >
              <Text style={styles.messageActionIcon}>✕</Text>
              <Text style={styles.messageActionText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerCloseArea}
            onPress={() => setShowImageViewer(false)}
          >
            <Text style={styles.imageViewerClose}>✕</Text>
          </TouchableOpacity>
          
          {selectedImage && (
            <Image
              source={{ 
                uri: selectedImage.startsWith('http') 
                  ? selectedImage 
                  : `${API_URL}/${selectedImage.replace(/\\/g, '/').replace(/^\/+/, '')}`
              }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* File Upload Loading Overlay */}
      {isUploadingFile && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadContainer}>
            <ActivityIndicator size="large" color="#FFA500" />
            <Text style={styles.uploadText}>กำลังอัปโหลดไฟล์...</Text>
          </View>
        </View>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#F5C842',
    borderBottomWidth: 0,
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
  infoButton: {
    fontSize: 20,
    color: '#333',
    marginLeft: 12,
  },

  // Messages Styles
  messagesListContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F5C842'
  },
  messagesContainer: {
    padding: 16
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    backgroundColor: '#E6B800',
    color: '#333',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  messageContentContainer: {
    maxWidth: '80%',
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12, // เปลี่ยนจาก 18 เป็น 12 เพื่อให้เป็นสี่เหลี่ยมมนๆ
    backgroundColor: '#fff',
    flexShrink: 1,
  },
  myMessageBubble: {
    backgroundColor: '#fff',
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
    color: '#333'
  },
  otherMessageText: {
    color: '#333'
  },
  
  // Temporary message styles
  temporaryMessage: {
    opacity: 0.7,
  },
  temporaryText: {
    opacity: 0.8,
  },
  textMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingIndicator: {
    marginLeft: 8,
  },
  
  // Message Info Container (ข้างหน้ากล่องข้อความ)
  messageInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
  
  // Read Status External (ข้างนอกกล่อง)
  readStatusExternal: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  myReadStatusExternal: {
    color: '#666',
    textAlign: 'right',
  },
  otherReadStatusExternal: {
    color: '#666',
    textAlign: 'left',
  },

  // Input Styles
  inputContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#F5C842',
    borderTopWidth: 0,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
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

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5C842',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#F5C842',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalHeaderButton: {
    fontSize: 16,
    color: '#FFA500',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  groupInfoContent: {
    flex: 1,
    padding: 16,
  },
  groupHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  membersSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  // Upload Overlay Styles
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  // Attachment Menu Styles
  attachmentMenu: {
    position: 'absolute',
    bottom: 70,
    left: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    minWidth: 120,
  },
  attachmentMenuIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  attachmentMenuText: {
    fontSize: 16,
    color: '#333',
  },
  // Message Image and File Styles
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 5,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileIconText: {
    fontSize: 18,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
  },
  // Image Viewer Styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseArea: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    padding: 10,
  },
  imageViewerClose: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  
  // Message Actions Modal Styles
  messageActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageActionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: 320,
  },
  messageActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  messageActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageActionIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 25,
    textAlign: 'center',
  },
  messageActionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  deleteAction: {
    backgroundColor: '#ffebee',
  },
  deleteActionText: {
    color: '#d32f2f',
  },
  cancelAction: {
    backgroundColor: '#f5f5f5',
    marginTop: 8,
  },
});

export default GroupChatScreen;
