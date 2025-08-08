import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api, { API_URL } from '../../service/api';
import * as ImagePicker from 'expo-image-picker';

const EditGroupScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { user: authUser } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setIsLoadingGroup(true);
      const response = await api.get(`/groups/${groupId}`);
      const group = response.data;
      
      console.log('📋 Group data loaded:', group);
      
      setGroupInfo(group);
      setGroupName(group.groupName || '');
      
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลกลุ่มได้');
      navigation.goBack();
    } finally {
      setIsLoadingGroup(false);
    }
  };

  const selectAvatarImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ข้อผิดพลาด', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupAvatar(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ชื่อกลุ่ม');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Updating group...');

      // อัปเดตชื่อกลุ่ม
      const nameResponse = await api.put(`/groups/${groupId}`, {
        groupName: groupName.trim(),
      });

      console.log('✅ Group name updated:', nameResponse.data);

      // อัปเดตรูปภาพกลุ่ม (ถ้ามี)
      if (groupAvatar && groupAvatar.uri) {
        const formData = new FormData();
        formData.append('avatar', {
          uri: groupAvatar.uri,
          type: 'image/jpeg',
          name: 'group-avatar.jpg',
        });

        const avatarResponse = await api.put(`/groups/${groupId}/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('✅ Group avatar updated:', avatarResponse.data);
      }

      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลกลุ่มเรียบร้อยแล้ว', [
        {
          text: 'ตกลง',
          onPress: () => navigation.goBack()
        }
      ]);

    } catch (error) {
      console.error('❌ Error updating group:', error);
      Alert.alert(
        'ข้อผิดพลาด', 
        error.response?.data?.message || 'ไม่สามารถอัปเดตข้อมูลกลุ่มได้'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingGroup) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูลกลุ่ม...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← กลับ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขกลุ่ม</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Avatar Section */}
        <View style={styles.avatarSection}>
          <Text style={styles.sectionTitle}>รูปภาพกลุ่ม</Text>
          <TouchableOpacity style={styles.avatarContainer} onPress={selectAvatarImage}>
            <Image
              source={{
                uri: groupAvatar?.uri ||
                     (groupInfo?.groupAvatar?.startsWith('http') 
                       ? groupInfo.groupAvatar 
                       : groupInfo?.groupAvatar 
                         ? `${API_URL}${groupInfo.groupAvatar}`
                         : 'https://via.placeholder.com/100')
              }}
              style={styles.avatar}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>แตะเพื่อเปลี่ยนรูปภาพ</Text>
        </View>

        {/* Group Name Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>ชื่อกลุ่ม</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="ใส่ชื่อกลุ่ม"
            maxLength={50}
          />
          <Text style={styles.charCount}>{groupName.length}/50</Text>
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={[styles.updateButton, isLoading && styles.updateButtonDisabled]}
          onPress={handleUpdateGroup}
          disabled={isLoading || !groupName.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>อัปเดตกลุ่ม</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    fontSize: 12,
  },
  avatarHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditGroupScreen;
