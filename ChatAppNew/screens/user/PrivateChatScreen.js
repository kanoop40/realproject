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
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../service/api';
import { useSocket } from '../../context/SocketContext';

const API_URL = 'http://192.168.2.38:5000';

const PrivateChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, leaveChatroom } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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
    if (socket && chatroomId) {
      console.log('🔌 Setting up socket listeners for private chat:', chatroomId);
      
      // เข้าร่วมห้องแชท
      joinChatroom(chatroomId);

      // ฟังข้อความใหม่
      const handleNewMessage = (data) => {
        console.log('💬 New message received:', data);
        setMessages(prevMessages => [...prevMessages, data.message]);
      };

      socket.on('newMessage', handleNewMessage);

      // Cleanup
      return () => {
        socket.off('newMessage', handleNewMessage);
        if (chatroomId) {
          leaveChatroom(chatroomId);
        }
      };
    }
  }, [socket, chatroomId]);

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
      setMessages(response.data.messages || []);
      
      // มาร์คข้อความว่าอ่านแล้ว
      await api.put(`/chats/${chatroomId}/read`);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [chatroomId]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !chatroomId || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const formData = new FormData();
      formData.append('content', messageToSend || 'ไฟล์แนบ');
      
      if (selectedFile) {
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType,
          name: selectedFile.name
        });
      }

      const response = await api.post(`/chats/${chatroomId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // เพิ่มข้อความใหม่ไปยัง state
      setMessages(prev => [...prev, response.data]);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend); // คืนข้อความถ้าส่งไม่สำเร็จ
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSending(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
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

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
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

  const downloadFile = (file) => {
    Alert.alert('ไฟล์', `ชื่อไฟล์: ${file.file_name}\nขนาด: ${formatFileSize(file.size)}`);
  };

  const renderMessage = useCallback(({ item }) => {
    const isMyMessage = item.sender._id === currentUser._id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <View style={styles.messageAvatarContainer}>
            {recipientAvatar ? (
              <Image
                source={{ uri: `${API_URL}/${recipientAvatar}` }}
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
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          {/* แสดงไฟล์ถ้ามี */}
          {item.file && (
            <TouchableOpacity 
              style={styles.fileAttachment}
              onPress={() => downloadFile(item.file)}
            >
              <Text style={styles.attachIcon}>📎</Text>
              <Text style={[
                styles.fileName,
                { color: isMyMessage ? "#fff" : "#007AFF" }
              ]}>
                {item.file.file_name}
              </Text>
              <Text style={[
                styles.fileSize,
                { color: isMyMessage ? "#fff" : "#666" }
              ]}>
                ({formatFileSize(item.file.size)})
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
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
              source={{ uri: `${API_URL}/${recipientAvatar}` }}
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
      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={12}
      />

      {/* Input สำหรับพิมพ์ข้อความ */}
      <View style={styles.inputContainer}>
        {/* แสดงไฟล์ที่เลือก */}
        {selectedFile && (
          <View style={styles.selectedFileContainer}>
            <View style={styles.fileInfo}>
              <Text style={styles.attachIcon}>📎</Text>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile.name}
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
        
        <View style={styles.messageInputRow}>
          <TouchableOpacity
            style={styles.fileButton}
            onPress={pickFile}
          >
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="พิมพ์ข้อความ..."
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
            style={[
              styles.sendButton,
              ((!newMessage.trim() && !selectedFile) || isSending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
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
  messagesList: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  myMessageText: {
    color: '#fff'
  },
  otherMessageText: {
    color: '#333'
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right'
  },
  otherMessageTime: {
    color: '#999'
  },

  // Input Styles
  inputContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd'
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
  },
  fileButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16
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

  // File attachment styles
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  fileSize: {
    fontSize: 12,
    marginLeft: 4,
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
});

export default PrivateChatScreen;
