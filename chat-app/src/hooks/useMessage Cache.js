import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes
const CACHE_PREFIX = 'messages_';

export const useMessageCache = () => {
  const getCachedMessages = useCallback(async (chatId) => {
    try {
      const cacheKey = `${CACHE_PREFIX}${chatId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(cacheKey);
        }
      }
      return null;
    } catch (error) {
      console.error('Get cached messages error:', error);
      return null;
    }
  }, []);

  const cacheMessages = useCallback(async (chatId, messages) => {
    try {
      const cacheKey = `${CACHE_PREFIX}${chatId}`;
      const cacheData = {
        data: messages,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache messages error:', error);
    }
  }, []);

  const updateMessageInCache = useCallback(async (chatId, message) => {
    try {
      const cachedMessages = await getCachedMessages(chatId);
      if (cachedMessages) {
        const updatedMessages = [message, ...cachedMessages];
        await cacheMessages(chatId, updatedMessages);
      }
    } catch (error) {
      console.error('Update message in cache error:', error);
    }
  }, []);

  const clearCache = useCallback(async (chatId) => {
    try {
      const cacheKey = `${CACHE_PREFIX}${chatId}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Clear cache error:', error);
    }
  }, []);

  return {
    getCachedMessages,
    cacheMessages,
    updateMessageInCache,
    clearCache
  };
};