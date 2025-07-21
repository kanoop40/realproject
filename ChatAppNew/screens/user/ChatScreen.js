import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../service/api';

const API_URL = 'http://192.168.2.38:5000'; // WiFi IP address

const ChatScreen = ({ route, navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [popupAnimation] = useState(new Animated.Value(0));
  
  // ตรวจสอบว่ามี params สำหรับเปิดแชทโดยตรงหรือไม่
  const { recipientId, recipientName, recipientAvatar } = route.params || {};

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (recipientId) {
        // ถ้ามี recipientId แสดงว่าต้องเปิดแชทโดยตรง
        handleDirectChat();
      } else {
        // ถ้าไม่มี recipientId ให้โหลดรายการแชท
        loadChats();
      }
    }
  }, [currentUser, recipientId]);

  const handleDirectChat = async () => {
    try {
      // ดูว่ามีห้องแชทอยู่แล้วหรือไม่
      const existingChats = await api.get('/chats');
      const existingChat = existingChats.data.find(chat => 
        chat.participants.some(p => p._id === recipientId)
      );

      if (existingChat) {
        setSelectedChat({
          _id: existingChat._id,
          roomName: existingChat.roomName,
          participants: existingChat.participants
        });
        loadMessages(existingChat._id);
      } else {
        // สร้างห้องแชทใหม่
        const response = await api.post('/chats', {
          roomName: `${currentUser.firstName} & ${recipientName}`,
          participants: [recipientId]
        });

        setSelectedChat({
          _id: response.data._id,
          roomName: response.data.roomName,
          participants: response.data.user_id
        });
        
        loadMessages(response.data._id);
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดแชทได้');
    }
  };

  const loadCurrentUser = async () => {
    try {
      console.log('ChatScreen: Loading current user...');
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('ChatScreen: No token found, redirecting to login');
        navigation.replace('Login');
        return;
      }

      console.log('ChatScreen: Fetching current user...');
      const response = await api.get('/users/current');
      console.log('ChatScreen: User data received:', response.data);

      if (response.data.role === 'admin') {
        console.log('ChatScreen: User is admin, redirecting to admin screen');
        navigation.replace('Admin');
        return;
      }

      console.log('ChatScreen: Setting current user');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('ChatScreen: Error loading user:', error);
      console.error('ChatScreen: Error response:', error.response?.data);
      if (error.response?.status === 401) {
        console.log('ChatScreen: Unauthorized, redirecting to login');
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${error.message}`);
      }
    } finally {
      console.log('ChatScreen: Setting loading to false');
      setIsLoading(false);
    }
  };

  const loadChats = useCallback(async () => {
    try {
      const response = await api.get('/chats');
      setChats(response.data);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, []);

  const loadMessages = useCallback(async (chatId) => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`);
      setMessages(response.data.messages);
      
      // มาร์คข้อความว่าอ่านแล้ว
      await api.put(`/chats/${chatId}/read`);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedChat || isSending) return;

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

      const response = await api.post(`/chats/${selectedChat._id}/messages`, formData, {
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

  const deleteChat = async (chatId) => {
    try {
      await api.delete(`/chats/${chatId}`);
      // รีเฟรชรายการแชท
      loadChats();
      setChatToDelete(null);
      Alert.alert('สำเร็จ', 'ลบห้องแชทเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบห้องแชทได้');
    }
  };

  const handleLongPressChat = (chat) => {
    setChatToDelete(chat);
    Alert.alert(
      'ลบห้องแชท',
      `คุณต้องการลบห้องแชท "${chat.roomName || 'แชทส่วนตัว'}" หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          style: 'destructive',
          onPress: () => deleteChat(chat._id)
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
    }
  };

  const createGroup = () => {
    // TODO: Navigate to create group screen
    Alert.alert('สร้างกลุ่ม', 'ฟีเจอร์นี้จะพัฒนาต่อไป');
    closePopup();
  };

  const openPopup = () => {
    setShowPopup(true);
    Animated.timing(popupAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const closePopup = () => {
    Animated.timing(popupAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setShowPopup(false);
    });
  };

  const navigateToSearch = () => {
    navigation.navigate('Search');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleChatPress = (chat) => {
    setSelectedChat(chat);
    loadMessages(chat._id);
  };

  const goBackToChats = () => {
    setSelectedChat(null);
    setMessages([]);
    loadChats();
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
    // TODO: Implement file download/opening functionality
    Alert.alert('ไฟล์', `ชื่อไฟล์: ${file.file_name}\nขนาด: ${formatFileSize(file.size)}`);
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
      return date.toLocaleDateString('th-TH');
    }
  };

  const renderChatItem = useCallback(({ item }) => {
    // หาผู้ใช้อื่นที่ไม่ใช่ตัวเอง
    const otherParticipant = item.participants.find(p => p._id !== currentUser._id);
    
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleLongPressChat(item)}
        delayLongPress={500}
      >
        <View style={styles.avatarContainer}>
          {otherParticipant?.avatar ? (
            <Image
              source={{ uri: `${API_URL}/${otherParticipant.avatar}` }}
              style={styles.avatar}
              defaultSource={require('../../assets/default-avatar.png')}
            />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {otherParticipant?.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>
            {otherParticipant ? 
              `${otherParticipant.firstName} ${otherParticipant.lastName}` :
              item.roomName
            }
          </Text>
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
          )}
        </View>
        
        <View style={styles.chatMeta}>
          {item.lastMessage && (
            <Text style={styles.timestamp}>
              {formatTime(item.lastMessage.timestamp)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [currentUser]);

  const renderMessage = useCallback(({ item }) => {
    const isMyMessage = item.sender._id === currentUser._id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <View style={styles.messageAvatarContainer}>
            {item.sender.avatar ? (
              <Image
                source={{ uri: `${API_URL}/${item.sender.avatar}` }}
                style={styles.messageAvatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.messageAvatar, styles.defaultMessageAvatar]}>
                <Text style={styles.messageAvatarText}>
                  {item.sender.firstName?.[0]?.toUpperCase() || '?'}
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
  }, [currentUser]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // หากเลือกแชทแล้ว แสดงหน้าข้อความ
  if (selectedChat) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header ของแชท */}
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            onPress={goBackToChats}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            {(() => {
              const otherParticipant = selectedChat.participants?.find(p => p._id !== currentUser._id);
              return (
                <>
                  {otherParticipant?.avatar ? (
                    <Image
                      source={{ uri: `${API_URL}/${otherParticipant.avatar}` }}
                      style={styles.headerAvatar}
                      defaultSource={require('../../assets/default-avatar.png')}
                    />
                  ) : (
                    <View style={[styles.headerAvatar, styles.defaultAvatar]}>
                      <Text style={styles.headerAvatarText}>
                        {otherParticipant?.firstName?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.headerTextInfo}>
                    <Text style={styles.chatHeaderName}>
                      {otherParticipant ? 
                        `${otherParticipant.firstName} ${otherParticipant.lastName}` :
                        selectedChat.roomName
                      }
                    </Text>
                  </View>
                </>
              );
            })()}
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
          inverted={false}
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
              enablesReturnKeyAutomatically={false}
              blurOnSubmit={false}
              autoCorrect={true}
              spellCheck={true}
              textContentType="none"
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
  }

  // หน้ารายการแชท

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={navigateToSearch}
          style={styles.iconButton}
        >
          <Text style={styles.headerIcon}>🔍</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>แชท</Text>

        <TouchableOpacity 
          onPress={navigateToProfile}
          style={styles.iconButton}
        >
          <Text style={styles.headerIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>ยังไม่มีข้อความ</Text>
          <Text style={styles.subText}>
            ค้นหาเพื่อนเพื่อเริ่มแชท
          </Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={navigateToSearch}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchButtonText}>ค้นหาเพื่อน</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          style={styles.chatsList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
          getItemLayout={(data, index) => (
            {length: 80, offset: 80 * index, index}
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={openPopup}
      >
        <Text style={styles.floatingIcon}>⋮</Text>
      </TouchableOpacity>

      {/* Popup Modal */}
      {showPopup && (
        <View style={styles.popupOverlay}>
          <TouchableOpacity 
            style={styles.popupBackground}
            onPress={closePopup}
          />
          <Animated.View 
            style={[
              styles.popupContainer,
              {
                transform: [
                  {
                    translateY: popupAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.popupItem}
              onPress={createGroup}
            >
              <Text style={styles.menuIcon}>👥</Text>
              <Text style={styles.popupText}>สร้างกลุ่ม</Text>
            </TouchableOpacity>
            
            <View style={styles.popupDivider} />
            
            <TouchableOpacity 
              style={styles.popupItem}
              onPress={() => {
                closePopup();
                setTimeout(() => {
                  Alert.alert(
                    'ออกจากระบบ',
                    'คุณต้องการออกจากระบบหรือไม่?',
                    [
                      { text: 'ยกเลิก', style: 'cancel' },
                      { text: 'ออกจากระบบ', style: 'destructive', onPress: handleLogout }
                    ]
                  );
                }, 300);
              }}
            >
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={[styles.popupText, { color: '#ff3b30' }]}>ออกจากระบบ</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  
  // Chat List Styles
  chatsList: {
    flex: 1
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  defaultAvatar: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666'
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  lastMessage: {
    fontSize: 14,
    color: '#666'
  },
  chatMeta: {
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  timestamp: {
    fontSize: 12,
    color: '#999'
  },

  // Chat Screen Styles
  chatHeader: {
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
  chatHeaderInfo: {
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
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666'
  },
  headerTextInfo: {
    flex: 1
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd'
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

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 24
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10
  },
  searchIcon: {
    marginRight: 8
  },

  // File attachment styles
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
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },

  // Floating Button Styles
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  // Popup Styles
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  popupBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popupContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    minHeight: 120,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  popupText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
    fontWeight: '500',
  },
  popupDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // Emoji Icon Styles
  backIcon: {
    fontSize: 20,
    color: '#007AFF',
  },
  headerIcon: {
    fontSize: 20,
    color: '#007AFF',
  },
  emptyIcon: {
    fontSize: 48,
    color: '#ccc',
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    color: '#fff',
  },
  floatingIcon: {
    fontSize: 24,
    color: '#fff',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
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

export default ChatScreen;