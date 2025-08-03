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
  Modal
} from 'react-native';
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

      socket.on('newMessage', handleNewMessage);

      return () => {
        socket.off('newMessage', handleNewMessage);
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

    try {
      const messageData = {
        content: messageText,
        groupId: groupId
      };

      console.log('📤 Sending group message:', messageData);
      const response = await api.post(`/groups/${groupId}/messages`, messageData);
      console.log('✅ Group message sent:', response.data);

      // Message will be added via socket listener
    } catch (error) {
      console.error('❌ Error sending group message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
      // Restore the message if failed
      setInputText(messageText);
    } finally {
      setIsSending(false);
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
                    ? { uri: `${API_URL}/${item.sender.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}` }
                    : require('../../assets/default-avatar.png')
                }
                style={styles.messageAvatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            </View>
          )}
          
          <View style={[
            styles.messageContentContainer,
            isMyMessage ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
          ]}>
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
                {formatDateTime(item.timestamp)}
              </Text>
            </View>
            
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
            </View>
          </View>
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
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={12}
          onContentSizeChange={() => {
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

      {/* Input */}
      <View style={styles.inputContainer}>
        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <View style={styles.attachmentMenu}>
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={() => {
                setShowAttachmentMenu(false);
                Alert.alert('รูปภาพ', 'ฟีเจอร์นี้จะเพิ่มในอนาคต');
              }}
            >
              <Text style={styles.attachmentMenuIcon}>🖼️</Text>
              <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={() => {
                setShowAttachmentMenu(false);
                Alert.alert('ไฟล์', 'ฟีเจอร์นี้จะเพิ่มในอนาคต');
              }}
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
            value={inputText}
            onChangeText={setInputText}
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
            style={styles.sendTextButton}
            onPress={sendMessage}
            disabled={!inputText.trim() || isSending}
          >
            <Text style={styles.sendTextLabel}>ส่ง</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderGroupInfoModal()}
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
    borderRadius: 18,
    backgroundColor: '#fff',
    flexShrink: 1,
  },
  myMessageBubble: {
    backgroundColor: '#fff',
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
});

export default GroupChatScreen;
