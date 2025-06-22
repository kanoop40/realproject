import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [userStats, setUserStats] = useState({
    totalChats: 0,
    totalGroups: 0,
    totalFiles: 0
  });

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/users/${user.id}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error('Load user stats error:', error);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 800,
        maxHeight: 800
      });

      if (!result.didCancel) {
        const formData = new FormData();
        formData.append('avatar', {
          uri: result.assets[0].uri,
          type: result.assets[0].type,
          name: result.assets[0].fileName
        });

        const response = await fetch(
          `${process.env.API_URL}/api/users/profile/avatar`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${user.token}`
            },
            body: formData
          }
        );

        if (response.ok) {
          const updatedUser = await response.json();
          updateUser(updatedUser);
          setProfileImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Update avatar error:', error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center py-6 bg-blue-500">
        <TouchableOpacity onPress={handleImagePick}>
          {profileImage || user.avatar ? (
            <Image
              source={{ uri: profileImage || user.avatar }}
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-white items-center justify-center">
              <Text className="text-3xl font-bold text-blue-500">
                {user.firstName[0]}
              </Text>
            </View>
          )}
          <View className="absolute bottom-0 right-0 bg-white rounded-full p-2">
            <Icon name="camera" size={20} color="#1D4ED8" />
          </View>
        </TouchableOpacity>

        <Text className="text-white text-xl font-bold mt-4">
          {user.firstName} {user.lastName}
        </Text>
        <Text className="text-white/80">
          {user.role}
        </Text>
      </View>

      <View className="flex-row justify-around py-4 bg-white shadow-sm">
        <View className="items-center">
          <Text className="text-2xl font-bold text-blue-500">
            {userStats.totalChats}
          </Text>
          <Text className="text-gray-600">แชท</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-blue-500">
            {userStats.totalGroups}
          </Text>
          <Text className="text-gray-600">กลุ่ม</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-blue-500">
            {userStats.totalFiles}
          </Text>
          <Text className="text-gray-600">ไฟล์</Text>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-lg font-bold mb-4">ข้อมูลส่วนตัว</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          className="flex-row items-center justify-between py-3 border-b border-gray-200"
        >
          <View>
            <Text className="font-medium">แก้ไขข้อมูลส่วนตัว</Text>
            <Text className="text-gray-500 text-sm">
              ชื่อ, นามสกุล, อีเมล
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ChangePassword')}
          className="flex-row items-center justify-between py-3 border-b border-gray-200"
        >
          <View>
            <Text className="font-medium">เปลี่ยนรหัสผ่าน</Text>
            <Text className="text-gray-500 text-sm">
              อัพเดทรหัสผ่านของคุณ
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationSettings')}
          className="flex-row items-center justify-between py-3 border-b border-gray-200"
        >
          <View>
            <Text className="font-medium">การแจ้งเตือน</Text>
            <Text className="text-gray-500 text-sm">
              จัดการการแจ้งเตือนต่างๆ
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Privacy')}
          className="flex-row items-center justify-between py-3 border-b border-gray-200"
        >
          <View>
            <Text className="font-medium">ความเป็นส่วนตัว</Text>
            <Text className="text-gray-500 text-sm">
              จัดการการมองเห็นและการเข้าถึง
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'ออกจากระบบ',
            'คุณต้องการออกจากระบบใช่หรือไม่?',
            [
              {
                text: 'ยกเลิก',
                style: 'cancel'
              },
              {
                text: 'ออกจากระบบ',
                style: 'destructive',
                onPress: () => {
                  // Implement logout
                }
              }
            ]
          );
        }}
        className="m-4 p-4 bg-red-500 rounded-lg"
      >
        <Text className="text-white text-center font-bold">
          ออกจากระบบ
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ProfileScreen;