import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const GroupInfoScreen = ({ route, navigation }) => {
  const { chatId } = route.params;
  const { user } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadGroupInfo();
  }, []);

  const loadGroupInfo = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/group/${chatId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setGroupInfo(data);
      setMembers(data.user_id);
    } catch (error) {
      console.error('Load group info error:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/group/${chatId}/members`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            userIds: [memberId]
          })
        }
      );

      if (response.ok) {
        setMembers(prev => prev.filter(m => m._id !== memberId));
      }
    } catch (error) {
      console.error('Remove member error:', error);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'ออกจากกลุ่ม',
      'คุณต้องการออกจากกลุ่มนี้ใช่หรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel'
        },
        {
          text: 'ออกจากกลุ่ม',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(
                `${process.env.API_URL}/api/group/${chatId}/leave`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${user.token}`
                  }
                }
              );
              navigation.navigate('ChatList');
            } catch (error) {
              console.error('Leave group error:', error);
            }
          }
        }
      ]
    );
  };

  if (!groupInfo) return null;

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center py-6 border-b border-gray-200">
        <Image
          source={{ uri: groupInfo.groupAvatar }}
          className="w-24 h-24 rounded-full"
        />
        <Text className="text-xl font-bold mt-2">
          {groupInfo.roomName}
        </Text>
        <Text className="text-gray-500 mt-1">
          {members.length} สมาชิก
        </Text>
      </View>

      <View className="p-4">
        <Text className="text-lg font-bold mb-2">
          รายละเอียดกลุ่ม
        </Text>
        <Text className="text-gray-600">
          {groupInfo.description}
        </Text>
      </View>

      <View className="p-4 border-t border-gray-200">
        <Text className="text-lg font-bold mb-2">
          สมาชิก
        </Text>
        {members.map(member => (
          <View 
            key={member._id}
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center">
              <Image
                source={{ uri: member.avatar }}
                className="w-10 h-10 rounded-full"
              />
              <View className="ml-3">
                <Text className="font-medium">
                  {member.firstName} {member.lastName}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {member.role}
                </Text>
              </View>
            </View>

            {groupInfo.admins?.includes(user.id) && 
             member._id !== user.id && (
              <TouchableOpacity
                onPress={() => handleRemoveMember(member._id)}
                className="p-2"
              >
                <Icon name="person-remove" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {!groupInfo.admins?.includes(user.id) && (
        <TouchableOpacity
          onPress={handleLeaveGroup}
          className="m-4 p-4 bg-red-500 rounded-lg"
        >
          <Text className="text-white text-center font-bold">
            ออกจากกลุ่ม
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default GroupInfoScreen;