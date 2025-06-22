import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const GroupSettingsScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    memberJoinRequests: true,
    memberMessages: true,
    fileSharing: true,
    memberInvites: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/group/${groupId}/settings`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Load settings error:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await fetch(
        `${process.env.API_URL}/api/group/${groupId}/settings`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            [key]: value
          })
        }
      );
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));
    } catch (error) {
      console.error('Update setting error:', error);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'ลบกลุ่ม',
      'การกระทำนี้ไม่สามารถยกเลิกได้ คุณต้องการลบกลุ่มนี้ใช่หรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel'
        },
        {
          text: 'ลบกลุ่ม',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(
                `${process.env.API_URL}/api/group/${groupId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${user.token}`
                  }
                }
              );
              navigation.navigate('ChatList');
            } catch (error) {
              console.error('Delete group error:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-lg font-bold mb-4">การแจ้งเตือน</Text>
        
        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <Text>การแจ้งเตือนข้อความ</Text>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => updateSetting('notifications', value)}
          />
        </View>
      </View>

      <View className="p-4 border-t border-gray-200">
        <Text className="text-lg font-bold mb-4">การตั้งค่าสมาชิก</Text>
        
        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <Text>อนุญาตคำขอเข้าร่วม</Text>
          <Switch
            value={settings.memberJoinRequests}
            onValueChange={(value) => updateSetting('memberJoinRequests', value)}
          />
        </View>

        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <Text>อนุญาตให้สมาชิกส่งข้อความ</Text>
          <Switch
            value={settings.memberMessages}
            onValueChange={(value) => updateSetting('memberMessages', value)}
          />
        </View>

        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <Text>อนุญาตให้สมาชิกแชร์ไฟล์</Text>
          <Switch
            value={settings.fileSharing}
            onValueChange={(value) => updateSetting('fileSharing', value)}
          />
        </View>

        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <Text>อนุญาตให้สมาชิกเชิญผู้อื่น</Text>
          <Switch
            value={settings.memberInvites}
            onValueChange={(value) => updateSetting('memberInvites', value)}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleDeleteGroup}
        className="m-4 p-4 bg-red-500 rounded-lg"
      >
        <Text className="text-white text-center font-bold">
          ลบกลุ่ม
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default GroupSettingsScreen;