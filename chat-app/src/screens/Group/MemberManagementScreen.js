import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const MemberManagementScreen = ({ route }) => {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.API_URL}/api/users/search?q=${query}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search users error:', error);
    }
  };

  const handleInvite = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/group/${groupId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            userIds: selectedUsers.map(u => u._id)
          })
        }
      );

      if (response.ok) {
        Alert.alert('สำเร็จ', 'เพิ่มสมาชิกเรียบร้อยแล้ว');
        setSelectedUsers([]);
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Invite members error:', error);
    }
  };

  const toggleUserSelection = (user) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(prev => prev.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <View className="mb-4">
        <Text className="text-lg font-bold mb-2">เพิ่มสมาชิก</Text>
        <TextInput
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchUsers(text);
          }}
          placeholder="ค้นหาผู้ใช้..."
          className="border border-gray-300 rounded-lg p-3"
        />
      </View>

      {selectedUsers.length > 0 && (
        <View className="mb-4">
          <Text className="text-gray-600 mb-2">ผู้ใช้ที่เลือก ({selectedUsers.length})</Text>
          <FlatList
            horizontal
            data={selectedUsers}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <View className="bg-blue-100 rounded-full px-3 py-1 mr-2 flex-row items-center">
                <Text className="text-blue-700">{item.firstName}</Text>
                <TouchableOpacity
                  onPress={() => toggleUserSelection(item)}
                  className="ml-2"
                >
                  <Icon name="close-circle" size={16} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      <FlatList
        data={searchResults}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => toggleUserSelection(item)}
            className="flex-row items-center justify-between py-3 border-b border-gray-200"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                <Text className="font-bold">{item.firstName[0]}</Text>
              </View>
              <View className="ml-3">
                <Text className="font-medium">
                  {item.firstName} {item.lastName}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {item.role}
                </Text>
              </View>
            </View>

            {selectedUsers.find(u => u._id === item._id) ? (
              <Icon name="checkmark-circle" size={24} color="#1D4ED8" />
            ) : (
              <Icon name="add-circle-outline" size={24} color="#666" />
            )}
          </TouchableOpacity>
        )}
      />

      {selectedUsers.length > 0 && (
        <TouchableOpacity
          onPress={handleInvite}
          className="bg-blue-500 rounded-lg p-4 mt-4"
        >
          <Text className="text-white text-center font-bold">
            เพิ่มสมาชิก ({selectedUsers.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MemberManagementScreen;