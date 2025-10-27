import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Lottie from 'lottie-react-native';
import api, { API_URL } from '../../service/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import { AvatarImage } from '../../service/avatarUtils';
import LoadingOverlay from '../../components/LoadingOverlay';
import TabBar from '../../components_user/TabBar';
import ProfileHeader from '../../components_user/ProfileHeader';
import ProfileSection from '../../components_user/ProfileSection';
import ProfileDetails from '../../components_user/ProfileDetails';
import ProfileActions from '../../components_user/ProfileActions';
import EditProfileModal from '../../components_user/EditProfileModal';
import ImagePickerModal from '../../components_user/ImagePickerModal';
import PasswordChangeModal from '../../components_user/PasswordChangeModal';

const ProfileScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // เพิ่ม loading state
  const [showProfileAnimation, setShowProfileAnimation] = useState(false); // สำหรับ profile animation
  const [showProfileContent, setShowProfileContent] = useState(false); // สำหรับแสดงเนื้อหา
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  // Removed loading hook - no longer using loading functionality
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
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
    setIsLoading(true);
    try {
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
      
      // เริ่มเล่น animation หลังจากได้ข้อมูลผู้ใช้แล้ว
      setIsLoading(false);
      setShowProfileAnimation(true);
      
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
        // ในกรณีเกิดข้อผิดพลาดก็หยุด loading
        setIsLoading(false);
      }
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

  // จัดการเมื่อ profile animation เสร็จ
  const handleProfileAnimationFinish = () => {
    setShowProfileAnimation(false);
    setShowProfileContent(true);
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
      // เอาการแจ้งเตือนออก - Alert.alert('สำเร็จ', 'อัพเดทโปรไฟล์เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error updating profile:', error);
      // เอาการแจ้งเตือนออก - Alert.alert('ข้อผิดพลาด', 'ไม่สามารถอัพเดทโปรไฟล์ได้');
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
      // เอาการแจ้งเตือนออก - Alert.alert('สำเร็จ', 'อัพโหลดรูปโปรไฟล์เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error uploading image:', error);
      // เอาการแจ้งเตือนออก - Alert.alert('ข้อผิดพลาด', 'ไม่สามารถอัพโหลดรูปภาพได้');
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

  const handleChangePassword = async () => {
    try {
      // Validate input
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        Alert.alert('ข้อผิดพลาด', 'รหัสผ่านใหม่ไม่ตรงกัน');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        Alert.alert('ข้อผิดพลาด', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }

      setIsUpdating(true);

      const response = await api.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      // เอาการแจ้งเตือนออก - Alert.alert('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
      // เอาการแจ้งเตือนออก - Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading screen removed - show content directly

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
        <View style={styles.headerPlaceholder} />
      </View>

      {/* แสดง Loading หรือ Profile Animation หรือเนื้อหา */}
      {isLoading ? (
        <LoadingOverlay />
      ) : showProfileAnimation ? (
        <View style={styles.animationContainer}>
          <TouchableOpacity 
            onPress={handleProfileAnimationFinish}
            style={styles.animationTouchable}
            activeOpacity={0.8}
          >
            <Lottie
              source={require('../../assets/Profile Avatar for Child.json')}
              autoPlay={true}
              loop={false}
              speed={2.0}
              style={styles.profileAnimation}
              onAnimationFinish={handleProfileAnimationFinish}
            />
          </TouchableOpacity>
          <Text style={styles.skipHintText}>แตะเพื่อข้าม</Text>
        </View>
      ) : showProfileContent ? (

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleImagePicker}
            disabled={isUpdating}
          >
            <AvatarImage
              avatarPath={currentUser?.avatar}
              firstName={currentUser?.firstName}
              lastName={currentUser?.lastName}
              size={120}
              style={styles.avatar}
            />
            
            <View style={styles.cameraIconContainer}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Lottie
                  source={require('../../assets/FaceID.json')}
                  autoPlay={true}
                  loop={true}
                  style={styles.faceIdIcon}
                />
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
          
          {/* เอา Avatar Notice ออก */}
          {/* <AvatarUnavailableNotice /> */}

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
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleEditProfile}
          >
            
            <Text style={styles.actionButtonText}>แก้ไขข้อมูล</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowPasswordModal(true)}
          >
            
            <Text style={styles.actionButtonText}>เปลี่ยนรหัสผ่าน</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutActionButton]} 
            onPress={handleLogout}
          >
            <Text style={styles.actionIcon}></Text>
            <Text style={[styles.actionButtonText, styles.logoutActionText]}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      ) : null}

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

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.passwordModalOverlay}>
          <View style={styles.passwordModalContainer}>
            <Text style={styles.passwordModalTitle}>เปลี่ยนรหัสผ่าน</Text>
            
            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordInputLabel}>รหัสผ่านปัจจุบัน</Text>
              <TextInput
                style={styles.passwordInput}
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                placeholder="กรุณากรอกรหัสผ่านปัจจุบัน"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordInputLabel}>รหัสผ่านใหม่</Text>
              <TextInput
                style={styles.passwordInput}
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                placeholder="กรุณากรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordInputLabel}>ยืนยันรหัสผ่านใหม่</Text>
              <TextInput
                style={styles.passwordInput}
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                placeholder="กรุณากรอกรหัสผ่านใหม่อีกครั้ง"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.passwordModalActions}>
              <TouchableOpacity 
                style={styles.passwordCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                <Text style={styles.passwordCancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.passwordSaveButton, isUpdating && styles.passwordSaveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.passwordSaveButtonText}>เปลี่ยนรหัสผ่าน</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

  {/* TabBar ถูกลบออกเพื่อใช้ TabBar จาก HOC เท่านั้น */}
      
      <LoadingOverlay 
        visible={isLoading} 
        message="กำลังโหลดข้อมูลโปรไฟล์..." 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Animation styles
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  animationTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAnimation: {
    width: 350,
    height: 350,
  },
  skipHintText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  faceIdIcon: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.sm + 2,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSecondary,
    ...SHADOWS.sm,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120, // เพิ่มพื้นที่ด้านล่างเพื่อให้เลื่อนได้จนสุด
  },
  profileSection: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.backgroundTertiary,
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
    ...SHADOWS.md,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  username: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm + 2,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
  },
  roleText: {
    marginLeft: 5,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accent,
    fontWeight: '500',
  },
  detailsSection: {
    backgroundColor: COLORS.background,
    marginTop: SPACING.sm + 2,
    paddingVertical: SPACING.sm + 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionsSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm + 4,
    width: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  logoutActionButton: {
    backgroundColor: '#ffebee',
    borderColor: COLORS.error,
  },
  actionIcon: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginRight: SPACING.sm,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: '#333',
    fontWeight: '500',
  },
  logoutActionText: {
    color: '#d32f2f',
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
  },
  
  // Action Buttons Styles (เก่า - ลบออก)
  
  // Password Modal Styles
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordModalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordInputGroup: {
    marginBottom: 15,
  },
  passwordInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  passwordCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  passwordCancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  passwordSaveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  passwordSaveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  passwordSaveButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const ProfileScreenWithTabBar = (props) => {
  return (
    <>
      <ProfileScreen {...props} />
      <TabBar navigation={props.navigation} activeTab="Profile" />
    </>
  );
};

export default ProfileScreenWithTabBar;
