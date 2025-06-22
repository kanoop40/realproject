import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

const CreateGroupScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [autoJoinRules, setAutoJoinRules] = useState({
    classrooms: [],
    studentIdPatterns: []
  });

  const handleImagePick = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7
    });

    if (!result.didCancel) {
      setGroupImage(result.assets[0]);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const formData = new FormData();
      formData.append('roomName', groupName);
      formData.append('description', description);
      
      if (groupImage) {
        formData.append('groupAvatar', {
          uri: groupImage.uri,
          type: groupImage.type,
          name: groupImage.fileName
        });
      }

      formData.append('autoJoinRules', JSON.stringify(autoJoinRules));

      const response = await fetch(
        `${process.env.API_URL}/api/group/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          },
          body: formData
        }
      );

      if (response.ok) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Create group error:', error);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <TouchableOpacity
        onPress={handleImagePick}
        className="items-center mb-6"
      >
        {groupImage ? (
          <Image
            source={{ uri: groupImage.uri }}
            className="w-24 h-24 rounded-full"
          />
        ) : (
          <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
            <Icon name="camera" size={32} color="#666" />
          </View>
        )}
        <Text className="mt-2 text-blue-500">เลือกรูปกลุ่ม</Text>
      </TouchableOpacity>

      <View className="mb-4">
        <Text className="text-gray-600 mb-1">ชื่อกลุ่ม</Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          className="border border-gray-300 rounded-lg p-3"
          placeholder="ใส่ชื่อกลุ่ม"
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-600 mb-1">รายละเอียด</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          className="border border-gray-300 rounded-lg p-3"
          placeholder="ใส่รายละเอียดกลุ่ม"
          multiline
          numberOfLines={3}
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-600 mb-2">การเข้าร่วมอัตโนมัติ</Text>
        
        {/* เลือกห้องเรียน */}
        <View className="mb-2">
          <Text className="text-gray-500 mb-1">ห้องเรียน</Text>
          <View className="flex-row flex-wrap">
            {autoJoinRules.classrooms.map((room, index) => (
              <View 
                key={index}
                className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center"
              >
                <Text className="text-blue-700">{room}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const newRooms = [...autoJoinRules.classrooms];
                    newRooms.splice(index, 1);
                    setAutoJoinRules(prev => ({
                      ...prev,
                      classrooms: newRooms
                    }));
                  }}
                  className="ml-2"
                >
                  <Icon name="close-circle" size={16} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => {
                // แสดง Modal เลือกห้องเรียน
              }}
              className="bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2"
            >
              <Text className="text-gray-600">+ เพิ่มห้องเรียน</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* กำหนดรูปแบบรหัสนักศึกษา */}
        <View>
          <Text className="text-gray-500 mb-1">รูปแบบรหัสนักศึกษา</Text>
          <View className="flex-row flex-wrap">
            {autoJoinRules.studentIdPatterns.map((pattern, index) => (
              <View 
                key={index}
                className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center"
              >
                <Text className="text-blue-700">{pattern}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const newPatterns = [...autoJoinRules.studentIdPatterns];
                    newPatterns.splice(index, 1);
                    setAutoJoinRules(prev => ({
                      ...prev,
                      studentIdPatterns: newPatterns
                    }));
                  }}
                  className="ml-2"
                >
                  <Icon name="close-circle" size={16} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => {
                // แสดง Modal กำหนดรูปแบบรหัสนักศึกษา
              }}
              className="bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2"
            >
              <Text className="text-gray-600">+ เพิ่มรูปแบบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleCreateGroup}
        disabled={!groupName}
        className={`rounded-lg p-4 ${
          groupName ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <Text className="text-white text-center font-bold">
          สร้างกลุ่ม
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateGroupScreen;