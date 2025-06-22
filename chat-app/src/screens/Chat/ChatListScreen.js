import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const ChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/chat/user-chats`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Load chats error:', error);
    }
  };

  const renderChatItem = ({ item }) => {
    const otherUser = item.user_id.find(u => u._id !== user.id);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Chat', {
          chatId: item._id,
          roomName: item.type === 'group' ? item.roomName : otherUser.firstName
        })}
        className="flex-row items-center p-4 border-b border-gray-200"
      >
        <Image
          source={{ 
            uri: item.type === 'group' 
              ? item.groupAvatar 
              : otherUser.avatar 
          }}
          className="w-12 h-12 rounded-full"
        />
        
        <View className="ml-4 flex-1">
          <Text className="font-bold">
            {item.type === 'group' ? item.roomName : otherUser.firstName}
          </Text>
          {item.lastMessage && (
            <Text 
              numberOfLines={1} 
              className="text-gray-500"
            >
              {item.lastMessage.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={chats}
        keyExtractor={item => item._id}
        renderItem={renderChatItem}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('NewChat')}
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center"
      >
        <Icon name="create" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default ChatListScreen;