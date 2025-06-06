import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

export default function TestPickImage() {
  const [avatar, setAvatar] = useState(null);

  const handlePickImage = async () => {
    console.log('กดเปลี่ยนรูปแล้ว');
    const result = await launchImageLibrary({ mediaType: 'photo' });
    console.log('ผลลัพธ์จาก picker:', result);
    if (result.didCancel) {
      Alert.alert('ยกเลิกเลือกรูป');
      return;
    }
    if (result.errorCode) {
      Alert.alert('เกิดข้อผิดพลาด', result.errorMessage);
      return;
    }
    if (result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <TouchableOpacity onPress={handlePickImage}>
        <Image
          source={avatar ? { uri: avatar } : require('../assets/avatar-default.jpg')}
          style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee' }}
        />
        <Text style={{ textAlign: 'center', marginTop: 8}}>เปลี่ยนรูป</Text>
      </TouchableOpacity>
    </View>
  );
}