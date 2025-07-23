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
import api, { API_URL } from '../../service/api';
import { useSocket } from '../../context/SocketContext';

const PrivateChatScreen = ({ route, navigation }) => {
  const { socket, joinChatroom, leaveChatroom } = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
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
    if (socket && chatroomId) {
      console.log('🔌 Setting up socket listeners for private chat:', chatroomId);
      
      // เข้าร่วมห้องแชท
      joinChatroom(chatroomId);

      // ฟังข้อความใหม่
      const handleNewMessage = (data) => {
        console.log('💬 New message received:', data);
        if (data.message && data.message.sender && data.message.sender._id !== currentUser?._id) {
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
            api.put(`/chats/${chatroomId}/read`).catch(err => {
              console.log('Error marking message as read:', err);
            });
          }
        }
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
      
      // Scroll ไปข้อความล่าสุดเมื่อโหลดเสร็จ
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [chatroomId]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !chatroomId || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()}_${currentUser._id}`;
    
    // Optimistic UI - เพิ่มข้อความทันทีก่อนส่งไปเซิร์ฟเวอร์
    const optimisticMessage = {
      _id: tempId,
      content: messageToSend || 'ไฟล์แนบ',
      sender: currentUser,
      timestamp: new Date().toISOString(),
      file: selectedFile ? {
        file_name: selectedFile.name,
        file_path: selectedFile.uri,
        size: selectedFile.size
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
    setSelectedFile(null);

    try {
      const formData = new FormData();
      formData.append('content', messageToSend || 'ไฟล์แนบ');
      
      if (fileToSend) {
        formData.append('file', {
          uri: fileToSend.uri,
          type: fileToSend.mimeType,
          name: fileToSend.name
        });
      }

      const response = await api.post(`/chats/${chatroomId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // แทนที่ข้อความชั่วคราวด้วยข้อความจริงจากเซิร์ฟเวอร์
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg._id === tempId ? { ...response.data, isOptimistic: false } : msg
        );
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
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          item.isOptimistic && styles.optimisticMessage
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
            item.isOptimistic && styles.optimisticMessageText
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
            {item.isOptimistic ? 'กำลังส่ง...' : formatTime(item.timestamp)}
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
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => {
          // ใช้ _id เป็นหลัก แต่ถ้าไม่มีให้สร้าง unique key
          if (item._id) {
            return item._id;
          }
          return `message_${index}_${item.timestamp}_${item.sender?._id || 'unknown'}`;
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
});

export default PrivateChatScreen;
