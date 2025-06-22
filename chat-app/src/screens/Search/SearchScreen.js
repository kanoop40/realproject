import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const SearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('messages'); // messages, files, users
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/search/${activeTab}?q=${searchQuery}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Chat', {
        chatId: item.chat_id,
        messageId: item._id
      })}
      className="p-4 border-b border-gray-200"
    >
      <Text className="font-medium mb-1">
        {item.chat.roomName || item.sender.firstName}
      </Text>
      <Text className="text-gray-600" numberOfLines={2}>
        {item.content}
      </Text>
      <Text className="text-gray-400 text-sm mt-1">
        {new Date(item.time).toLocaleString('th-TH')}
      </Text>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        // Handle file download/preview
      }}
      className="p-4 border-b border-gray-200 flex-row items-center"
    >
      <View className="w-10 h-10 bg-gray-100 rounded items-center justify-center mr-3">
        <Icon 
          name={
            item.file_type.includes('image') ? 'image' :
            item.file_type.includes('pdf') ? 'document-text' :
            'document'
          }
          size={24}
          color="#666"
        />
      </View>
      <View className="flex-1">
        <Text className="font-medium" numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text className="text-gray-400 text-sm">
          {(item.size / 1024).toFixed(1)} KB
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile', { userId: item._id })}
      className="p-4 border-b border-gray-200 flex-row items-center"
    >
      {item.avatar ? (
        <Image
          source={{ uri: item.avatar }}
          className="w-10 h-10 rounded-full"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
          <Text className="font-bold">{item.firstName[0]}</Text>
        </View>
      )}
      <View className="ml-3">
        <Text className="font-medium">
          {item.firstName} {item.lastName}
        </Text>
        <Text className="text-gray-500 text-sm">
          {item.role}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-4">
          <Icon name="search" size={20} color="#666" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={performSearch}
            placeholder="ค้นหา..."
            className="flex-1 ml-2 py-2"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="p-2"
            >
              <Icon name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row mt-4">
          <TouchableOpacity
            onPress={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-full mr-2 ${
              activeTab === 'messages' ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={
                activeTab === 'messages' ? 'text-white' : 'text-gray-600'
              }
            >
              ข้อความ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-full mr-2 ${
              activeTab === 'files' ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={
                activeTab === 'files' ? 'text-white' : 'text-gray-600'
              }
            >
              ไฟล์
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-full ${
              activeTab === 'users' ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <Text
              className={
                activeTab === 'users' ? 'text-white' : 'text-gray-600'
              }
            >
              ผู้ใช้
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item._id}
          renderItem={
            activeTab === 'messages' ? renderMessageItem :
            activeTab === 'files' ? renderFileItem :
            renderUserItem
          }
          ListEmptyComponent={
            searchQuery ? (
              <View className="p-4 items-center">
                <Text className="text-gray-500">
                  ไม่พบผลการค้นหา
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default SearchScreen;