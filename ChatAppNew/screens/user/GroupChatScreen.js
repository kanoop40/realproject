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
  const [isScrollingToEnd, setIsScrollingToEnd] = useState(false); // Loading สำหรับการ scroll ไปข้อความล่าสุด
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false); // Track ว่า scroll ไปข้อความล่าสุดแล้วหรือยัง
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
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  
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
        console.log('📎 Message file info:', {
          messageType: data.message?.messageType,
          fileUrl: data.message?.fileUrl,
          fileName: data.message?.fileName,
          fileSize: data.message?.fileSize,
          mimeType: data.message?.mimeType
        });
        
        if (data.chatroomId === groupId) {
          // เพิ่มข้อความใหม่ที่ท้าย array (ข้อความล่าสุดอยู่ล่าง)
          // แก้ไขข้อมูล message ที่ได้รับจาก socket ให้มี fileUrl หากเป็น image/file
          const messageToAdd = { ...data.message };
          
          // ตรวจสอบและแก้ไข fileUrl
          if (messageToAdd.messageType === 'image') {
            if (!messageToAdd.fileUrl) {
              // ถ้าไม่มี fileUrl สำหรับรูปภาพ แสดงว่ามีปัญหาการอัปโหลด
              console.warn('⚠️ Image message missing fileUrl:', messageToAdd._id);
              messageToAdd.fileUrl = null; // ไม่สร้าง fallback URL ที่ผิด
            } else {
              console.log('✅ Image fileUrl from backend:', messageToAdd.fileUrl);
            }
          }
          
          if (messageToAdd.messageType === 'file') {
            if (!messageToAdd.fileUrl) {
              console.warn('⚠️ File message missing fileUrl:', messageToAdd._id);
              messageToAdd.fileUrl = null; // ไม่สร้าง fallback URL ที่ผิด
            } else {
              console.log('✅ File fileUrl from backend:', messageToAdd.fileUrl);
            }
          }
          
          setMessages(prevMessages => [...prevMessages, messageToAdd]);
          
          // เลื่อนไปข้อความล่าสุดเมื่อมีข้อความใหม่
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
      // โหลดเฉพาะ 50 ข้อความล่าสุด
      const response = await api.get(`/groups/${groupId}/messages?limit=50&page=1`);
      console.log('📨 Loaded messages:', response.data.data?.length || 0);
      console.log('📨 Sample message sender:', response.data.data?.[0]?.sender);
      
      // ไม่ต้อง reverse เพราะ backend ส่งมาเรียงจากเก่าไปใหม่แล้ว
      setMessages(response.data.data || []);
      
      console.log('📨 Messages set, total:', response.data.data?.length || 0);
      
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความได้');
    } finally {
      setIsLoading(false);
      // เริ่มแสดง loading สำหรับการ scroll ไปข้อความล่าสุด
      if (response?.data?.data?.length > 0) {
        setIsScrollingToEnd(true);
        setHasScrolledToEnd(false); // Reset flag
        // บังคับ scroll ไปข้อความล่าสุดทันทีหลังโหลด
        setTimeout(() => {
          console.log('🎯 Force scrolling to end after loading, messages:', response.data.data.length);
          if (response.data.data.length > 0) {
            // ลอง scrollToIndex ไปข้อความสุดท้าย
            try {
              flatListRef.current?.scrollToIndex({ 
                index: response.data.data.length - 1, 
                animated: false,
                viewPosition: 1 // scroll ให้ item อยู่ด้านล่างสุด
              });
            } catch (error) {
              // ถ้า scrollToIndex ไม่ได้ ให้ใช้ scrollToEnd
              console.log('ScrollToIndex failed, using scrollToEnd');
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }
          // ให้เวลา layout เสร็จก่อน
          setTimeout(() => {
            setIsScrollingToEnd(false);
            setHasScrolledToEnd(true); // Mark as scrolled
          }, 500); // เพิ่มเวลาให้มากขึ้น
        }, 300); // เพิ่มเวลารอให้ messages โหลดเสร็จ
      }
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
    
    // เพิ่มข้อความ temp ที่ท้าย array (ข้อความใหม่อยู่ล่าง)
    setMessages(prevMessages => [...prevMessages, tempMessage]);
    
    // ไม่ต้อง scroll เพราะข้อความใหม่จะแสดงที่ล่างอัตโนมัติ

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
      
      // เลื่อนไปข้อความล่าสุดหลังส่งสำเร็จ
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  // ฟังก์ชันส่งรูปภาพ (ปรับปรุงให้เหมือน PrivateChat)
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
        
        // ถาม user ว่าจะพิมพ์ข้อความด้วยหรือไม่
        Alert.prompt(
          'ส่งรูปภาพ',
          'คุณต้องการเพิ่มข้อความด้วยหรือไม่?',
          [
            {
              text: 'ยกเลิก',
              style: 'cancel',
            },
            {
              text: 'ส่งเฉพาะรูป',
              onPress: () => uploadImageWithMessage(asset, '📷 รูปภาพ'),
            },
            {
              text: 'เพิ่มข้อความ',
              onPress: (text) => uploadImageWithMessage(asset, text || '📷 รูปภาพ'),
            },
          ],
          'plain-text',
          '',
          'default'
        );
      }
    } catch (error) {
      console.error('❌ Error selecting image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  // ฟังก์ชันอัปโหลดรูปพร้อมข้อความ
  const uploadImageWithMessage = async (asset, messageText) => {
    try {
      // Optimistic UI for image
      const tempImageMessage = {
        _id: `temp_img_${Date.now()}`,
        content: messageText,
        messageType: 'image',
        sender: authUser,
        timestamp: new Date().toISOString(),
        fileUrl: asset.uri, // Use local URI for immediate display
        fileName: asset.fileName || `image_${Date.now()}.jpg`,
        isTemporary: true,
        isSending: true
      };
      
      // เพิ่มข้อความ temp ที่ท้าย array (ข้อความใหม่อยู่ล่าง)
      setMessages(prevMessages => [...prevMessages, tempImageMessage]);
      setIsUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`,
      });
      formData.append('groupId', groupId);
      
      // เพิ่มข้อความหากมี
      if (messageText && messageText !== '📷 รูปภาพ') {
        formData.append('content', messageText);
      }

      console.log('📤 Uploading image to group with message:', groupId, messageText);
      const response = await api.post(`/groups/${groupId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for image upload
      });

      console.log('✅ Image uploaded to group:', response.data);
      
      // Remove temporary message since real one will come via socket
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id !== tempImageMessage._id)
      );
      
      // เลื่อนไปข้อความล่าสุดหลังส่งรูปสำเร็จ
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Error sending image:', error);
      // Remove temporary message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id.startsWith('temp_img_'))
      );
      
      let errorMessage = 'ไม่สามารถส่งรูปภาพได้';
      if (error.message.includes('Network Error')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'การส่งไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่';
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ฟังก์ชันส่งไฟล์ (ปรับปรุงให้เหมือน PrivateChat)
  const sendFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowAttachmentMenu(false);
        
        const asset = result.assets[0];
        
        // ถาม user ว่าจะพิมพ์ข้อความด้วยหรือไม่
        Alert.prompt(
          'ส่งไฟล์',
          'คุณต้องการเพิ่มข้อความด้วยหรือไม่?',
          [
            {
              text: 'ยกเลิก',
              style: 'cancel',
            },
            {
              text: 'ส่งเฉพาะไฟล์',
              onPress: () => uploadFileWithMessage(asset, asset.name || 'ไฟล์แนบ'),
            },
            {
              text: 'เพิ่มข้อความ',
              onPress: (text) => uploadFileWithMessage(asset, text || (asset.name || 'ไฟล์แนบ')),
            },
          ],
          'plain-text',
          '',
          'default'
        );
      }
    } catch (error) {
      console.error('❌ Error selecting file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  // ฟังก์ชันอัปโหลดไฟล์พร้อมข้อความ
  const uploadFileWithMessage = async (asset, messageText) => {
    try {
      // Optimistic UI for file
      const tempFileMessage = {
        _id: `temp_file_${Date.now()}`,
        content: messageText,
        messageType: 'file',
        sender: authUser,
        timestamp: new Date().toISOString(),
        fileName: asset.name,
        fileSize: asset.size,
        isTemporary: true,
        isSending: true
      };
      
      // เพิ่มข้อความ temp ที่ท้าย array (ข้อความใหม่อยู่ล่าง)
      setMessages(prevMessages => [...prevMessages, tempFileMessage]);
      setIsUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name || `file_${Date.now()}`,
      });
      formData.append('groupId', groupId);
      
      // เพิ่มข้อความหากมี
      if (messageText && messageText !== asset.name && messageText !== 'ไฟล์แนบ') {
        formData.append('content', messageText);
      }

      console.log('📤 Uploading file to group with message:', groupId, messageText);
      const response = await api.post(`/groups/${groupId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for file upload
      });

      console.log('✅ File uploaded to group:', response.data);
      
      // Remove temporary message since real one will come via socket
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id !== tempFileMessage._id)
      );
      
      // เลื่อนไปข้อความล่าสุดหลังส่งไฟล์สำเร็จ
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Error sending file:', error);
      // Remove temporary message on error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg._id.startsWith('temp_file_'))
      );
      
      let errorMessage = 'ไม่สามารถส่งไฟล์ได้';
      if (error.message.includes('Network Error')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'การส่งไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่';
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ฟังก์ชันถ่ายรูป (ปรับปรุงให้เหมือน PrivateChat)
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
        setShowAttachmentMenu(false);
        
        const asset = result.assets[0];
        
        // ถาม user ว่าจะพิมพ์ข้อความด้วยหรือไม่
        Alert.prompt(
          'ส่งรูปถ่าย',
          'คุณต้องการเพิ่มข้อความด้วยหรือไม่?',
          [
            {
              text: 'ยกเลิก',
              style: 'cancel',
            },
            {
              text: 'ส่งเฉพาะรูป',
              onPress: () => uploadImageWithMessage(asset, '📷 รูปถ่าย'),
            },
            {
              text: 'เพิ่มข้อความ',
              onPress: (text) => uploadImageWithMessage(asset, text || '📷 รูปถ่าย'),
            },
          ],
          'plain-text',
          '',
          'default'
        );
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้');
    }
  };

  // ฟังก์ชั่นสำหรับกดที่ไฟล์
  const showFileOptions = (fileUrl, fileName) => {
    if (!fileUrl) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเข้าถึงไฟล์ได้');
      return;
    }

    Alert.alert(
      fileName || 'ไฟล์',
      'คุณต้องการทำอะไรกับไฟล์นี้?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ดาวน์โหลด',
          onPress: () => downloadFile(fileUrl, fileName),
        },
        {
          text: 'เปิดดู',
          onPress: () => previewFile(fileUrl, fileName),
        },
      ]
    );
  };

  // ฟังก์ชั่นสำหรับดาวน์โหลดไฟล์
  const downloadFile = async (fileUrl, fileName) => {
    try {
      console.log('Downloading file:', fileUrl);
      
      // แปลง URL ให้ถูกต้อง
      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        fullUrl = API_URL + (fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl);
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      // สร้างไดเรกทอรีการดาวน์โหลด
      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      
      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const timestamp = new Date().getTime();
      const finalFileName = fileName || `file_${timestamp}`;
      const localUri = `${downloadDir}${finalFileName}`;

      // ดาวน์โหลดไฟล์
      const downloadResult = await FileSystem.downloadAsync(
        fullUrl,
        localUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (downloadResult.status === 200) {
        Alert.alert(
          'ดาวน์โหลดสำเร็จ',
          `ไฟล์ถูกบันทึกที่: ${downloadResult.uri}`,
          [
            {
              text: 'ตกลง',
            },
            {
              text: 'แชร์',
              onPress: () => {
                Sharing.shareAsync(downloadResult.uri);
              },
            },
          ]
        );
      } else {
        throw new Error(`HTTP ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // ฟังก์ชั่นสำหรับดูไฟล์
  const previewFile = async (fileUrl, fileName) => {
    try {
      console.log('Previewing file:', fileUrl);
      
      // แปลง URL ให้ถูกต้อง
      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        fullUrl = API_URL + (fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl);
      }

      // ตรวจสอบประเภทไฟล์
      const fileExtension = fileName ? fileName.split('.').pop().toLowerCase() : '';
      
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
        // ถ้าเป็นรูปภาพ ให้เปิด modal
        setSelectedModalImage(fullUrl);
        setImageModalVisible(true);
      } else if (fileExtension === 'pdf') {
        // ถ้าเป็น PDF ให้เปิดใน browser
        const supported = await Linking.canOpenURL(fullUrl);
        if (supported) {
          await Linking.openURL(fullUrl);
        } else {
          Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ PDF ได้');
        }
      } else {
        // ไฟล์ประเภทอื่นๆ ให้ถามว่าจะดาวน์โหลดหรือไม่
        Alert.alert(
          'เปิดไฟล์',
          'ไฟล์นี้ไม่สามารถดูตัวอย่างได้ คุณต้องการดาวน์โหลดหรือไม่?',
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'ดาวน์โหลด', onPress: () => downloadFile(fileUrl, fileName) }
          ]
        );
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ได้');
    }
  };

  // ฟังก์ชั่นสำหรับดาวน์โหลดรูปภาพจาก modal
  const downloadImageFromModal = async (imageUrl) => {
    try {
      console.log('Downloading image from modal:', imageUrl);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      // สร้างไดเรกทอรีการดาวน์โหลด
      const downloadDir = `${FileSystem.documentDirectory}downloads/`;
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      
      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const timestamp = new Date().getTime();
      const fileName = `image_${timestamp}.jpg`;
      const localUri = `${downloadDir}${fileName}`;

      // ดาวน์โหลดรูปภาพ
      const downloadResult = await FileSystem.downloadAsync(
        imageUrl,
        localUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'ChatApp/1.0',
          },
        }
      );

      if (downloadResult.status === 200) {
        Alert.alert(
          'ดาวน์โหลดสำเร็จ',
          `รูปภาพถูกบันทึกที่: ${downloadResult.uri}`,
          [
            {
              text: 'ตกลง',
            },
            {
              text: 'แชร์',
              onPress: () => {
                Sharing.shareAsync(downloadResult.uri);
              },
            },
          ]
        );
        
        // ปิด modal
        setImageModalVisible(false);
      } else {
        throw new Error(`HTTP ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error downloading image from modal:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดรูปภาพได้');
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
              {item.messageType === 'image' && (
                <TouchableOpacity
                  onPress={() => {
                    // ตรวจสอบ fileUrl ก่อนเปิด modal
                    if (!item.fileUrl) {
                      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแสดงรูปภาพได้ เนื่องจากไฟล์อาจเสียหาย');
                      return;
                    }
                    
                    // สร้าง URL สำหรับรูปภาพ
                    let imageUrl = item.fileUrl;
                    
                    // ถ้าเป็น local URI (เช่น file://) ให้ใช้ตรงๆ
                    if (imageUrl.startsWith('file://') || imageUrl.startsWith('content://')) {
                      setSelectedModalImage(imageUrl);
                    } else {
                      // ถ้าไม่ใช่ HTTP URL ให้เพิ่ม API_URL
                      if (!imageUrl.startsWith('http')) {
                        imageUrl = `${API_URL}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
                      }
                      setSelectedModalImage(imageUrl);
                    }
                    setImageModalVisible(true);
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
                  {item.fileUrl ? (
                    <Image
                      source={{ 
                        uri: (() => {
                          const baseUrl = item.fileUrl;
                          
                          // ถ้าเป็น local URI (เช่น file://) ให้ใช้ตรงๆ
                          if (baseUrl.startsWith('file://') || baseUrl.startsWith('content://')) {
                            console.log('🔗 Using local URI:', baseUrl);
                            return baseUrl;
                          }
                          
                          // ถ้าเป็น HTTP URL แล้วให้ใช้ตรงๆ
                          if (baseUrl.startsWith('http')) {
                            console.log('🔗 Using HTTP URL:', baseUrl);
                            return baseUrl;
                          }
                          
                          // ถ้าไม่ใช่ให้เพิ่ม API_URL
                          const finalUrl = `${API_URL}${baseUrl.startsWith('/') ? baseUrl : '/' + baseUrl}`;
                          console.log('🔗 Constructed URL:', finalUrl);
                          return finalUrl;
                        })()
                      }}
                      style={styles.messageImage}
                      resizeMode="cover"
                      defaultSource={require('../../assets/default-avatar.png')}
                      onError={(error) => {
                        console.log('❌ Error loading image for message:', item._id);
                        console.log('❌ Failed URL:', item.fileUrl);
                        console.log('❌ Error details:', error.nativeEvent?.error);
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully for message:', item._id);
                      }}
                    />
                  ) : (
                    <View style={[styles.messageImage, styles.brokenImageContainer]}>
                      <Text style={styles.brokenImageText}>📷</Text>
                      <Text style={styles.brokenImageSubtext}>รูปภาพไม่พร้อมใช้งาน</Text>
                      <Text style={styles.brokenImageSubtext}>(ไฟล์เก่าอาจหายไป)</Text>
                    </View>
                  )}
                  {item.content !== '📷 รูปภาพ' && item.content !== '📷 รูปถ่าย' && (
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
              {item.messageType === 'file' && (
                <TouchableOpacity
                  style={styles.fileContainer}
                  onPress={() => {
                    if (!item.fileUrl) {
                      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเข้าถึงไฟล์ได้ เนื่องจากไฟล์อาจเสียหาย');
                      return;
                    }
                    showFileOptions(item.fileUrl, item.fileName || 'ไฟล์');
                  }}
                >
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>📎</Text>
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[
                      styles.fileName,
                      isMyMessage ? styles.myMessageText : styles.otherMessageText
                    ]}>
                      {item.fileName || item.content || 'ไฟล์แนบ'}
                      {!item.fileUrl && ' (ไฟล์เก่าอาจหายไป)'}
                    </Text>
                    {item.fileSize && (
                      <Text style={styles.fileSize}>
                        {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                    {!item.fileSize && (
                      <Text style={styles.fileSize}>
                        ขนาดไม่ทราบ
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
      {/* Loading overlay สำหรับการ scroll */}
      {isScrollingToEnd && (
        <View style={styles.scrollLoadingOverlay}>
          <ActivityIndicator size="large" color="#FFA500" />
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
          onContentSizeChange={(contentWidth, contentHeight) => {
            // ไปที่ข้อความล่าสุดทันทีเมื่อโหลดข้อความ โดยไม่มี animation
            // แต่ทำแค่ครั้งเดียวหลังโหลดข้อความ
            if (messages.length > 0 && !hasScrolledToEnd && isScrollingToEnd) {
              console.log('📏 Content size changed, scrolling to end. Messages:', messages.length);
              // ใช้ requestAnimationFrame เพื่อให้แน่ใจว่า layout เสร็จแล้ว
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                setIsScrollingToEnd(false);
                setHasScrolledToEnd(true);
              });
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

      {/* Image Modal for viewing and downloading */}
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
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
          
          {selectedModalImage && (
            <View style={styles.modalImageContainer}>
              <Image
                source={{ 
                  uri: selectedModalImage,
                  headers: {
                    'User-Agent': 'ChatApp/1.0',
                  }
                }}
                style={styles.modalImage}
                resizeMode="contain"
                onError={(error) => {
                  console.error('Error loading modal image:', error);
                }}
              />
              
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => downloadImageFromModal(selectedModalImage)}
              >
                <Text style={styles.downloadButtonText}>💾 ดาวน์โหลด</Text>
              </TouchableOpacity>
            </View>
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
  brokenImageContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  brokenImageText: {
    fontSize: 24,
    marginBottom: 4,
  },
  brokenImageSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  
  // Modal styles for image viewing and download
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    padding: 10,
  },
  modalClose: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  downloadButton: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
