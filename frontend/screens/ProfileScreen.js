import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import api from '../service/api';

const API_URL = 'http://10.0.2.2:5000';

const ProfileScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    faculty: '',
    major: '',
    groupCode: '',
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found, redirecting to login');
        navigation.replace('Login');
        return;
      }

      console.log('Fetching current user with token:', token?.substring(0, 20) + '...');
      const response = await api.get('/users/current');
      console.log('Current user response:', response.data);
      setCurrentUser(response.data);
      
      // Initialize edit form with current data
      setEditForm({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        faculty: response.data.faculty || '',
        major: response.data.major || '',
        groupCode: response.data.groupCode || '',
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        console.log('Unauthorized, removing token and redirecting to login');
        await AsyncStorage.removeItem('userToken');
        navigation.replace('Login');
      } else {
        Alert.alert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              navigation.replace('Login');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);
      
      // Validate required fields
      if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
        Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        return;
      }

      const response = await api.put('/users/update-profile', editForm);
      setCurrentUser(response.data);
      setShowEditModal(false);
      Alert.alert('สำเร็จ', 'อัพเดทโปรไฟล์เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถอัพเดทโปรไฟล์ได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImagePicker = () => {
    setShowImagePicker(true);
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('ต้องการสิทธิ์', 'แอปต้องการสิทธิ์ในการเข้าถึงกล้อง');
      setShowImagePicker(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    setShowImagePicker(false);
    
    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  const selectImageFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('ต้องการสิทธิ์', 'แอปต้องการสิทธิ์ในการเข้าถึงแกลเลอรี่');
      setShowImagePicker(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    setShowImagePicker(false);
    
    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (imageAsset) => {
    try {
      setIsUpdating(true);
      
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const response = await api.post('/users/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setCurrentUser(prev => ({ ...prev, avatar: response.data.avatar }));
      Alert.alert('สำเร็จ', 'อัพโหลดรูปโปรไฟล์เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถอัพโหลดรูปภาพได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const translateRole = (role) => {
    switch (role) {
      case 'student': return 'นักศึกษา';
      case 'teacher': return 'อาจารย์';
      case 'admin': return 'ผู้ดูแลระบบ';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>โปรไฟล์</Text>
        <TouchableOpacity 
          onPress={handleEditProfile}
          style={styles.editButton}
        >
          <Icon name="edit" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleImagePicker}
            disabled={isUpdating}
          >
            {currentUser?.avatar ? (
              <Image
                source={{ uri: `${API_URL}/${currentUser.avatar}` }}
                style={styles.avatar}
                defaultSource={require('../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>
                  {currentUser?.firstName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            
            <View style={styles.cameraIconContainer}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="camera-alt" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {currentUser?.firstName || ''} {currentUser?.lastName || ''}
          </Text>
          <Text style={styles.username}>@{currentUser?.username || ''}</Text>
          <View style={styles.roleContainer}>
            <Icon name="verified-user" size={16} color="#007AFF" />
            <Text style={styles.roleText}>{translateRole(currentUser?.role)}</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Icon name="email" size={20} color="#666" />
            <Text style={styles.detailLabel}>อีเมล</Text>
            <Text style={styles.detailValue}>{currentUser?.email || ''}</Text>
          </View>

          {currentUser?.faculty && (
            <View style={styles.detailItem}>
              <Icon name="school" size={20} color="#666" />
              <Text style={styles.detailLabel}>คณะ</Text>
              <Text style={styles.detailValue}>{currentUser.faculty}</Text>
            </View>
          )}

          {currentUser?.major && (
            <View style={styles.detailItem}>
              <Icon name="library-books" size={20} color="#666" />
              <Text style={styles.detailLabel}>สาขา</Text>
              <Text style={styles.detailValue}>{currentUser.major}</Text>
            </View>
          )}

          {currentUser?.groupCode && currentUser?.role !== 'teacher' && (
            <View style={styles.detailItem}>
              <Icon name="group" size={20} color="#666" />
              <Text style={styles.detailLabel}>รหัสกลุ่ม</Text>
              <Text style={styles.detailValue}>{currentUser.groupCode}</Text>
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#ff3b30" />
            <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>แก้ไขโปรไฟล์</Text>
              <TouchableOpacity 
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ชื่อ</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, firstName: text }))}
                  placeholder="กรุณากรอกชื่อ"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>นามสกุล</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, lastName: text }))}
                  placeholder="กรุณากรอกนามสกุล"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>อีเมล</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                  placeholder="กรุณากรอกอีเมล"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>คณะ</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.faculty}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, faculty: text }))}
                  placeholder="กรุณากรอกคณะ"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>สาขา</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.major}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, major: text }))}
                  placeholder="กรุณากรอกสาขา"
                />
              </View>

              {currentUser?.role !== 'teacher' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>รหัสกลุ่ม</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.groupCode}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, groupCode: text }))}
                    placeholder="กรุณากรอกรหัสกลุ่ม"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.editModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>บันทึก</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.imagePickerOverlay}>
          <View style={styles.imagePickerContainer}>
            <Text style={styles.imagePickerTitle}>เลือกรูปโปรไฟล์</Text>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={takePhoto}
            >
              <Icon name="camera-alt" size={24} color="#007AFF" />
              <Text style={styles.imagePickerOptionText}>ถ่ายภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={selectImageFromLibrary}
            >
              <Icon name="photo-library" size={24} color="#007AFF" />
              <Text style={styles.imagePickerOptionText}>เลือกจากแกลเลอรี่</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imagePickerCancel}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.imagePickerCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#fff',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  detailsSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingVertical: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingVertical: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logoutButtonText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  editModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  editModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 10,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Image Picker Modal Styles
  imagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imagePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  imagePickerOptionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  imagePickerCancel: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  imagePickerCancelText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '500',
  },
});

export default ProfileScreen;
