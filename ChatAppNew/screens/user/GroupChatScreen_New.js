import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  Image, TextInput, KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const GroupChatScreen = ({ route, navigation }) => {
  const { user: authUser } = useAuth();
  const { socket, joinChatroom } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const flatListRef = useRef(null);

  const { groupId, groupName, groupAvatar } = route.params || {};

  useEffect(() => {
    loadGroupData();
    if (socket && groupId) {
      joinChatroom(groupId);
      socket.on('newMessage', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);
      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [groupId, socket]);

  const loadGroupData = async () => {
    try {
      const [messagesRes, groupRes] = await Promise.all([
        api.get(`/groups/${groupId}/messages?limit=50&page=1`),
        api.get(`/groups/${groupId}`)
      ]);
      setMessages(messagesRes.data.messages || []);
      setGroupInfo(groupRes.data);
      setGroupMembers(groupRes.data.members || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMessage = (data) => {
    if (data.groupId !== groupId || data.message?.sender?._id === authUser._id) return;
    setMessages(prev => {
      if (prev.some(msg => msg._id === data.message._id)) return prev;
      return [...prev, data.message];
    });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleMessageDeleted = (data) => {
    if (data.groupId === groupId) {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    }
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && !selectedFile && !selectedImage) || isSending) return;
    
    setIsSending(true);
    const tempId = `temp_${Date.now()}_${authUser._id}`;
    const optimisticMessage = {
      _id: tempId,
      content: inputText.trim() || (selectedImage ? 'รูปภาพ' : 'ไฟล์แนบ'),
      sender: authUser,
      timestamp: new Date().toISOString(),
      messageType: selectedImage ? 'image' : selectedFile ? 'file' : 'text',
      isTemporary: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    
    const messageText = inputText.trim();
    const fileToSend = selectedFile;
    const imageToSend = selectedImage;
    setInputText('');
    setSelectedFile(null);
    setSelectedImage(null);
    setShowAttachmentMenu(false);

    try {
      const formData = new FormData();
      formData.append('content', messageText || (imageToSend ? 'รูปภาพ' : 'ไฟล์แนบ'));
      
      if (imageToSend) {
        formData.append('file', {
          uri: imageToSend.uri,
          type: imageToSend.mimeType || 'image/jpeg',
          name: imageToSend.fileName || `image_${Date.now()}.jpg`
        });
      } else if (fileToSend) {
        formData.append('file', {
          uri: fileToSend.uri,
          type: fileToSend.mimeType || 'application/octet-stream',
          name: fileToSend.name || fileToSend.fileName || `file_${Date.now()}`
        });
      }

      const response = await api.post(`/groups/${groupId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => {
        const filtered = prev.filter(msg => msg._id !== tempId);
        return prev.some(msg => msg._id === response.data._id) ? filtered : [...filtered, response.data];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setInputText(messageText);
      setSelectedFile(fileToSend);
      setSelectedImage(imageToSend);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSending(false);
    }
  };

  const pickFile = async (isImage = false) => {
    try {
      setShowAttachmentMenu(false);
      
      if (isImage) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setSelectedImage(result.assets[0]);
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!result.cancelled && result.assets?.[0]) {
          setSelectedFile(result.assets[0]);
        } else if (result.type === 'success') {
          setSelectedFile(result);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      Alert.alert('กำลังดาวน์โหลด', 'กรุณารอสักครู่...');
      const downloadResult = await FileSystem.downloadAsync(
        fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`,
        FileSystem.documentDirectory + (fileName || `file_${Date.now()}`)
      );
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('ดาวน์โหลดเรียบร้อย', `ไฟล์ถูกบันทึกที่: ${downloadResult.uri}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดได้');
    }
  };

  const deleteMessage = async (messageId) => {
    Alert.alert('ลบข้อความ', 'คุณต้องการลบข้อความนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/groups/${groupId}/messages/${messageId}`);
            setMessages(prev => prev.filter(msg => msg._id !== messageId));
          } catch (error) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
          }
        }
      }
    ]);
  };

  const leaveGroup = async () => {
    Alert.alert('ออกจากกลุ่ม', 'คุณต้องการออกจากกลุ่มนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากกลุ่ม', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/groups/${groupId}/leave`);
            Alert.alert('สำเร็จ', 'ออกจากกลุ่มแล้ว', [
              { text: 'ตกลง', onPress: () => navigation.goBack() }
            ]);
          } catch (error) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากกลุ่มได้');
          }
        }
      }
    ]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender?._id === authUser._id;
    
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {!isMyMessage && (
          <View style={styles.senderInfo}>
            <Image
              source={{
                uri: item.sender?.avatar?.startsWith('http') 
                  ? item.sender.avatar 
                  : item.sender?.avatar 
                    ? `${API_URL}${item.sender.avatar}`
                    : 'https://via.placeholder.com/40'
              }}
              style={styles.senderAvatar}
            />
            <Text style={styles.senderName}>{item.sender?.name || item.sender?.firstName || 'Unknown'}</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}
          onLongPress={() => isMyMessage && deleteMessage(item._id)}
          delayLongPress={800}
        >
          {/* รูปภาพ */}
          {(item.messageType === 'image' || item.file?.url?.match(/\.(jpg|jpeg|png|gif)$/i)) && (
            <TouchableOpacity
              onPress={() => {
                const imageUri = item.file?.url || item.fileUrl;
                setSelectedModalImage(imageUri?.startsWith('http') ? imageUri : `${API_URL}${imageUri}`);
                setImageModalVisible(true);
              }}
            >
              <Image
                source={{
                  uri: (() => {
                    const imageUri = item.file?.url || item.fileUrl;
                    return imageUri?.startsWith('http') ? imageUri : `${API_URL}${imageUri}`;
                  })()
                }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* ไฟล์ */}
          {item.messageType === 'file' && !item.file?.url?.match(/\.(jpg|jpeg|png|gif)$/i) && (
            <TouchableOpacity
              style={styles.fileContainer}
              onPress={() => downloadFile(item.file?.url || item.fileUrl, item.file?.file_name || item.fileName)}
            >
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>📄</Text>
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.file?.file_name || item.fileName || 'ไฟล์แนบ'}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(item.file?.size || item.fileSize)}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ข้อความ */}
          {item.content && item.content.trim() !== '' && (
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
          )}

          {/* เวลา */}
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
            {item.isTemporary ? 'กำลังส่ง...' : formatTime(item.timestamp)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <Image
        source={{
          uri: item.avatar?.startsWith('http') 
            ? item.avatar 
            : item.avatar 
              ? `${API_URL}${item.avatar}`
              : 'https://via.placeholder.com/40'
        }}
        style={styles.memberAvatar}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name || item.firstName || 'Unknown'}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      {item._id === groupInfo?.admin && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.groupInfoContainer}
          onPress={() => setShowMembersModal(true)}
        >
          <Image
            source={{
              uri: groupAvatar?.startsWith('http') 
                ? groupAvatar 
                : groupAvatar 
                  ? `${API_URL}${groupAvatar}`
                  : 'https://via.placeholder.com/40'
            }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.memberCount}>{groupMembers.length} สมาชิก</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={leaveGroup} style={styles.leaveButton}>
          <Text style={styles.leaveButtonText}>ออก</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={{ padding: 10 }}
      />

      {/* Selected File/Image Preview */}
      {(selectedFile || selectedImage) && (
        <View style={styles.selectedFileContainer}>
          <View style={styles.selectedFile}>
            {selectedImage && (
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImagePreview} />
            )}
            <Text style={styles.selectedFileIcon}>{selectedImage ? '🖼️' : '📄'}</Text>
            <Text style={styles.selectedFileName} numberOfLines={1}>
              {(selectedImage?.fileName || selectedFile?.name || selectedFile?.fileName || 'ไฟล์ที่เลือก')}
            </Text>
            <TouchableOpacity onPress={() => { setSelectedFile(null); setSelectedImage(null); }}>
              <Text style={styles.removeFileButton}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={(text) => setInputText(text.replace(/\n/g, ''))}
          placeholder="พิมพ์ข้อความ..."
          multiline={false}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>→</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Attachment Menu */}
      {showAttachmentMenu && (
        <View style={styles.attachmentMenu}>
          <TouchableOpacity style={styles.attachmentOption} onPress={() => pickFile(true)}>
            <Text style={styles.attachmentOptionIcon}>🖼️</Text>
            <Text style={styles.attachmentOptionText}>รูปภาพ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentOption} onPress={() => pickFile(false)}>
            <Text style={styles.attachmentOptionIcon}>📄</Text>
            <Text style={styles.attachmentOptionText}>ไฟล์</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members Modal */}
      <Modal visible={showMembersModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.membersModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>สมาชิกในกลุ่ม ({groupMembers.length})</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowMembersModal(false)}
              >
                <Text style={styles.closeModalButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={groupMembers}
              keyExtractor={(item) => item._id || item.user?._id}
              renderItem={renderMemberItem}
              style={styles.membersList}
            />
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={imageModalVisible} transparent>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalBackground}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.imageModalContent}>
              <Image
                source={{ uri: selectedModalImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.imageModalButtons}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => downloadFile(selectedModalImage, `image_${Date.now()}.jpg`)}
                >
                  <Text style={styles.downloadButtonText}>💾 บันทึก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeImageModalButton}
                  onPress={() => setImageModalVisible(false)}
                >
                  <Text style={styles.closeImageModalButtonText}>✕ ปิด</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0'
  },
  backButton: { marginRight: 10 },
  backButtonText: { fontSize: 24, color: '#007AFF' },
  groupInfoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  memberCount: { fontSize: 12, color: '#666', marginTop: 2 },
  leaveButton: { backgroundColor: '#ff4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  leaveButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  messagesList: { flex: 1, paddingHorizontal: 10 },
  messageContainer: { marginVertical: 5 },
  myMessage: { alignItems: 'flex-end' },
  otherMessage: { alignItems: 'flex-start' },
  
  senderInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  senderAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 8 },
  senderName: { fontSize: 12, color: '#666', fontWeight: '500' },
  
  messageBubble: {
    maxWidth: '80%', padding: 10, borderRadius: 15, marginBottom: 2
  },
  myMessageBubble: { backgroundColor: '#007AFF', borderBottomRightRadius: 5 },
  otherMessageBubble: {
    backgroundColor: '#fff', borderBottomLeftRadius: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  
  messageText: { fontSize: 16, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#333' },
  messageTime: { fontSize: 11, marginTop: 5 },
  myMessageTime: { color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right' },
  otherMessageTime: { color: '#999' },
  
  messageImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 5 },
  
  fileContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 8, marginBottom: 5
  },
  fileIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  fileIconText: { fontSize: 18 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#333' },
  fileSize: { fontSize: 12, color: '#666', marginTop: 2 },

  selectedFileContainer: {
    backgroundColor: '#f0f0f0', padding: 10,
    borderTopWidth: 1, borderTopColor: '#e0e0e0'
  },
  selectedFile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 10, borderRadius: 8
  },
  selectedFileIcon: { fontSize: 20, marginRight: 10 },
  selectedFileName: { flex: 1, fontSize: 14, color: '#333' },
  selectedImagePreview: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  removeFileButton: { fontSize: 18, color: '#ff4444', marginLeft: 10 },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0'
  },
  attachButton: { marginRight: 10, padding: 8 },
  attachButtonText: { fontSize: 20 },
  textInput: {
    flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20,
    paddingHorizontal: 15, paddingVertical: 10, marginRight: 10,
    backgroundColor: '#f9f9f9', fontSize: 16, maxHeight: 40
  },
  sendButton: {
    backgroundColor: '#007AFF', width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center'
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  attachmentMenu: {
    position: 'absolute', bottom: 70, left: 20, backgroundColor: '#fff',
    borderRadius: 10, padding: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
  },
  attachmentOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 15, minWidth: 120
  },
  attachmentOptionIcon: { fontSize: 20, marginRight: 10 },
  attachmentOptionText: { fontSize: 16, color: '#333' },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  membersModalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeModalButton: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center'
  },
  closeModalButtonText: { fontSize: 16, color: '#666' },
  membersList: { padding: 10 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    backgroundColor: '#f9f9f9', marginBottom: 8, borderRadius: 10
  },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  adminBadge: { backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  imageModalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)' },
  imageModalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageModalContent: { width: '90%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '90%' },
  imageModalButtons: { flexDirection: 'row', marginTop: 20 },
  downloadButton: {
    backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, marginRight: 10
  },
  downloadButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeImageModalButton: { backgroundColor: '#666', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  closeImageModalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default GroupChatScreen;
