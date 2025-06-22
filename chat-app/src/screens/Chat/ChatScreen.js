import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { socket, socketEvents } from '../utils/socket';
import { getMessage, sendMessage } from '../services/messageService';

// Components
import MessageBubble from '../components/Chat/MessageBubble';
import MessageInput from '../components/Chat/MessageInput';
import TypingIndicator from '../components/Chat/TypingIndicator';
import ChatHeader from '../components/Chat/ChatHeader';
import OfflineNotice from '../components/Common/OfflineNotice';
import RetryBanner from '../components/Common/RetryBanner';

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, chatName } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(!socket.connected);
  const [failedMessages, setFailedMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const flatListRef = useRef(null);
  const messageRetryQueue = useRef(new Map());

  // Load initial messages
  useEffect(() => {
    loadMessages();
    socketEvents.joinChats([chatId]);

    return () => {
      socket.emit('leave_chat', chatId);
    };
  }, [chatId]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (data) => {
      setMessages(prev => [data.message, ...prev]);
      markMessageAsRead(data.message._id);
    };

    const handleTypingUpdate = ({ users }) => {
      setTypingUsers(users);
    };

    const handleConnectionChange = (isConnected) => {
      setOffline(!isConnected);
      if (isConnected) {
        retryFailedMessages();
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing_update', handleTypingUpdate);
    socket.on('connect', () => handleConnectionChange(true));
    socket.on('disconnect', () => handleConnectionChange(false));

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing_update', handleTypingUpdate);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const loadMessages = async (pageToLoad = 1) => {
    try {
      setLoading(pageToLoad === 1);
      const response = await getMessage(chatId, { page: pageToLoad });
      
      if (pageToLoad === 1) {
        setMessages(response.messages);
      } else {
        setMessages(prev => [...prev, ...response.messages]);
      }
      
      setHasMore(response.hasMore);
      setPage(pageToLoad);
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถโหลดข้อความได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMessages(1);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMessages(page + 1);
    }
  };

  const markMessageAsRead = (messageId) => {
    socketEvents.markRead(chatId, [messageId]);
  };

  const handleSendMessage = async (content, file = null) => {
    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      content,
      file_id: null,
      user_id: {
        _id: 'kanoop40', // Current user from context
      },
      createdAt: new Date().toISOString(),
      sending: true,
    };

    // Add to messages optimistically
    setMessages(prev => [newMessage, ...prev]);

    try {
      let fileId = null;
      if (file) {
        fileId = await uploadFile(file);
      }

      const sentMessage = await sendMessage({
        chatId,
        content,
        fileId,
      });

      // Replace temp message with actual message
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId ? sentMessage : msg
        )
      );
    } catch (error) {
      // Mark message as failed
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...msg, failed: true, sending: false }
            : msg
        )
      );

      // Add to retry queue
      messageRetryQueue.current.set(tempId, {
        content,
        file,
        retryCount: 0,
      });

      setFailedMessages(prev => [...prev, tempId]);
    }
  };

  const retryMessage = async (messageId) => {
    const messageData = messageRetryQueue.current.get(messageId);
    if (!messageData) return;

    // Update retry count
    messageRetryQueue.current.set(messageId, {
      ...messageData,
      retryCount: messageData.retryCount + 1,
    });

    // Remove from failed messages
    setFailedMessages(prev =>
      prev.filter(id => id !== messageId)
    );

    // Retry sending
    try {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, sending: true, failed: false }
            : msg
        )
      );

      await handleSendMessage(
        messageData.content,
        messageData.file
      );

      // Remove from retry queue on success
      messageRetryQueue.current.delete(messageId);
    } catch (error) {
      // Will be handled by handleSendMessage
      console.error('Retry failed:', error);
    }
  };

  const retryFailedMessages = () => {
    failedMessages.forEach(retryMessage);
  };

  return (
    <View className="flex-1 bg-white">
      <ChatHeader
        title={chatName}
        onBack={() => navigation.goBack()}
        online={!offline}
      />
      
      {offline && <OfflineNotice />}
      
      {failedMessages.length > 0 && (
        <RetryBanner
          count={failedMessages.length}
          onRetry={retryFailedMessages}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" className="mt-4" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id}
          inverted
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onRetry={() => retryMessage(item._id)}
              onLongPress={() => handleMessageOptions(item)}
            />
          )}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator size="small" className="my-4" />
            ) : null
          }
        />
      )}

      <TypingIndicator users={typingUsers} />
      
      <MessageInput
        chatId={chatId}
        onSend={handleSendMessage}
        disabled={offline}
      />
    </View>
  );
};

export default ChatScreen;