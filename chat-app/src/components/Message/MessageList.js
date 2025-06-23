import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  ActivityIndicator,
  View,
  RefreshControl
} from 'react-native';
import { useMessageCache } from '../../hooks/useMessageCache';
import MessageItem from './MessageItem';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../utils/socket';

const MESSAGES_PER_PAGE = 30;

const MessageList = ({ chatId }) => {
  const { user } = useAuth();
  const { 
    getCachedMessages, 
    cacheMessages,
    updateMessageInCache 
  } = useMessageCache();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const flatListRef = useRef(null);

  const fetchMessages = async (pageNum = 1, shouldRefresh = false) => {
    try {
      // ตรวจสอบ cache ก่อน
      if (pageNum === 1) {
        const cachedMessages = getCachedMessages(chatId);
        if (cachedMessages && !shouldRefresh) {
          setMessages(cachedMessages);
          return;
        }
      }

      setLoading(true);
      const response = await fetch(
        `${process.env.API_URL}/api/messages/${chatId}?` + 
        `page=${pageNum}&limit=${MESSAGES_PER_PAGE}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      
      const newMessages = data.messages;
      if (shouldRefresh) {
        setMessages(newMessages);
        cacheMessages(chatId, newMessages);
      } else {
        setMessages(prev => [...prev, ...newMessages]);
      }
      
      setHasMore(newMessages.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchMessages(page + 1);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchMessages(1, true);
  };

  const handleNewMessage = useCallback((message) => {
    setMessages(prev => [message, ...prev]);
    updateMessageInCache(chatId, message);
  }, [chatId]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      if (response.ok) {
        setMessages(prev => 
          prev.filter(msg => msg._id !== messageId)
        );
        // อัพเดท cache
        const cachedMessages = getCachedMessages(chatId);
        if (cachedMessages) {
          const updatedCache = cachedMessages.filter(
            msg => msg._id !== messageId
          );
          cacheMessages(chatId, updatedCache);
        }
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  }, [chatId]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      inverted
      keyExtractor={item => item._id}
      renderItem={({ item }) => (
        <MessageItem
          message={item}
          isOwnMessage={item.user_id === user.id}
          onDelete={() => handleDeleteMessage(item._id)}
        />
      )}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loading && hasMore ? (
          <View className="py-4">
            <ActivityIndicator size="small" color="#1D4ED8" />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    />
  );
};

export default MessageList;