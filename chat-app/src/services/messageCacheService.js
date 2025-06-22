import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@chat_cache:';
const MESSAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class MessageCacheService {
  static async getCachedMessages(chatId) {
    try {
      const cacheKey = `${CACHE_PREFIX}${chatId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const { messages, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - timestamp > MESSAGE_CACHE_DURATION) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return messages;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  static async cacheMessages(chatId, messages) {
    try {
      const cacheKey = `${CACHE_PREFIX}${chatId}`;
      const cacheData = {
        messages,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  static async clearCache(chatId) {
    try {
      if (chatId) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${chatId}`);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const chatKeys = keys.filter(key => 
          key.startsWith(CACHE_PREFIX)
        );
        await AsyncStorage.multiRemove(chatKeys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}