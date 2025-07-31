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
import * as ImagePicker from 'expo-image-picker';
import api, { API_URL } from '../../service/api';

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
      console.log('User avatar from API:', response.data.avatar);
      console.log('Full avatar URL will be:', `${API_URL}/${response.data.avatar}`);
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

      // ส่งเฉพาะข้อมูลที่อนุญาตให้แก้ไข
      const allowedData = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim()
      };

      const response = await api.put('/users/update-profile', allowedData);
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

      const response = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Avatar upload response:', response.data);
      
      // อัพเดทข้อมูลผู้ใช้
      const newAvatarPath = response.data.avatar;
      setCurrentUser(prev => ({ 
        ...prev, 
        avatar: newAvatarPath 
      }));
      
      console.log('📸 New avatar path set:', newAvatarPath);
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
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>โปรไฟล์</Text>
        <TouchableOpacity 
          onPress={handleEditProfile}
          style={styles.editButton}
        >
          <Text style={styles.editIcon}>✏️</Text>
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
                source={{ 
                  uri: currentUser.avatar.startsWith('http') 
                    ? currentUser.avatar 
                    : `${API_URL}/${currentUser.avatar.replace(/\\/g, '/')}`
                }}
                style={styles.avatar}
                defaultSource={require('../../assets/default-avatar.png')}
                onLoad={() => console.log('✅ Avatar image loaded successfully')}
                onError={(error) => {
                  console.error('❌ Avatar image load error:', error);
                  console.log('❌ Avatar path:', currentUser.avatar);
                  console.log('❌ Full URL:', `${API_URL}/${currentUser.avatar.replace(/\\/g, '/')}`);
                }}
                onLoadStart={() => console.log('🔄 Avatar image loading started')}
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
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {currentUser?.firstName || ''} {currentUser?.lastName || ''}
          </Text>
          <Text style={styles.username}>{currentUser?.username || ''}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.verifiedIcon}></Text>
            <Text style={styles.roleText}>{translateRole(currentUser?.role)}</Text>
          </View>
          
          {/* Online Status */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: currentUser?.isOnline ? '#34C759' : '#8E8E93' }]} />
            <Text style={[styles.statusText, { color: currentUser?.isOnline ? '#34C759' : '#8E8E93' }]}>
              {currentUser?.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
            </Text>
          </View>
       

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Text style={styles.emailIcon}></Text>
            <Text style={styles.detailLabel}>อีเมล</Text>
            <Text style={styles.detailValue}>{currentUser?.email || ''}</Text>
          </View>

          {currentUser?.faculty && (
            <View style={styles.detailItem}>
              <Text style={styles.schoolIcon}></Text>
              <Text style={styles.detailLabel}>คณะ</Text>
              <Text style={styles.detailValue}>{currentUser.faculty}</Text>
            </View>
          )}

          {currentUser?.major && (
            <View style={styles.detailItem}>
              <Text style={styles.bookIcon}></Text>
              <Text style={styles.detailLabel}>สาขา</Text>
              <Text style={styles.detailValue}>{currentUser.major}</Text>
            </View>
          )}

          {currentUser?.groupCode && currentUser?.role !== 'teacher' && (
            <View style={styles.detailItem}>
              <Text style={styles.groupIcon}></Text>
              <Text style={styles.detailLabel}>รหัสกลุ่ม</Text>
              <Text style={styles.detailValue}>{currentUser.groupCode}</Text>
            </View>
          )}
        </View>
 </View>
        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}></Text>
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
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalContent}>
              {/* ส่วนที่สามารถแก้ไขได้ */}
              <View style={styles.editableSection}>
                <Text style={styles.sectionTitle}>ข้อมูลที่สามารถแก้ไขได้</Text>
                
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
              </View>

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
              <Text style={styles.cameraPickerIcon}>📷</Text>
              <Text style={styles.imagePickerOptionText}>ถ่ายภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={selectImageFromLibrary}
            >
              <Text style={styles.libraryIcon}>🖼️</Text>
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
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333', // เปลี่ยนเป็นสีเข้ม
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
    borderBottomWidth: 0, // ลบเส้นขอบ
    borderBottomColor: 'transparent',
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
    backgroundColor: '#FFA500', // เปลี่ยนเป็นสีส้ม
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
    backgroundColor: '#FFA500', // เปลี่ยนเป็นสีส้ม
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
  
  // Section Styles
  editableSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  readOnlySection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  readOnlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  readOnlyLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  readOnlyValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
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
  backIcon: {
    fontSize: 24,
    color: '#333'
  },
  editIcon: {
    fontSize: 24,
    color: '#007AFF'
  },
  cameraIcon: {
    fontSize: 16,
    color: '#fff'
  },
  verifiedIcon: {
    fontSize: 16,
    color: '#007AFF'
  },
  emailIcon: {
    fontSize: 20,
    color: '#666'
  },
  schoolIcon: {
    fontSize: 20,
    color: '#666'
  },
  bookIcon: {
    fontSize: 20,
    color: '#666'
  },
  groupIcon: {
    fontSize: 20,
    color: '#666'
  },
  logoutIcon: {
    fontSize: 20,
    color: '#ff3b30'
  },
  closeIcon: {
    fontSize: 24,
    color: '#333'
  },
  cameraPickerIcon: {
    fontSize: 24,
    color: '#007AFF'
  },
  libraryIcon: {
    fontSize: 24,
    color: '#007AFF'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    alignSelf: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500'
  }
});

export default ProfileScreen;
