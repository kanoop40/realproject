import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Modal
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.2.38:5000';

const UserDetailScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(`${API_URL}/api/users/${userId}`, config);
      setUser(response.data);
      
      // เซ็ตข้อมูลในฟอร์มแก้ไข
      setEditForm({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        password: ''
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    try {
      if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
        Alert.alert('ผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      setIsUpdating(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const updateData = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim()
      };

      // เพิ่มรหัสผ่านเฉพาะเมื่อมีการกรอก
      if (editForm.password.trim()) {
        updateData.password = editForm.password.trim();
      }

      await axios.put(`${API_URL}/api/users/${userId}`, updateData, config);
      
      Alert.alert('สำเร็จ', 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว', [
        {
          text: 'ตกลง',
          onPress: () => {
            setShowEditModal(false);
            fetchUserDetails();
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const translateRole = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'อาจารย์';
      case 'student': return 'นักศึกษา';
      default: return role;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>ไม่พบข้อมูลผู้ใช้</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ข้อมูลผู้ใช้</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image
                source={{ uri: `${API_URL}/${user.avatar}` }}
                style={styles.avatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>
                  {user.firstName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userRole}>{translateRole(user.role)}</Text>
        </View>

        {/* User Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ชื่อผู้ใช้:</Text>
            <Text style={styles.infoValue}>{user.username}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ชื่อ:</Text>
            <Text style={styles.infoValue}>{user.firstName}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>นามสกุล:</Text>
            <Text style={styles.infoValue}>{user.lastName}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>อีเมล:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>สถานะ:</Text>
            <Text style={styles.infoValue}>{translateRole(user.role)}</Text>
          </View>

          {user.faculty && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>คณะ:</Text>
              <Text style={styles.infoValue}>{user.faculty}</Text>
            </View>
          )}

          {user.major && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>สาขา:</Text>
              <Text style={styles.infoValue}>{user.major}</Text>
            </View>
          )}

          {user.groupCode && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>กลุ่มเรียน:</Text>
              <Text style={styles.infoValue}>{user.groupCode}</Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>สถานะบัญชี:</Text>
            <Text style={[styles.infoValue, { color: user.status === 'active' ? '#34C759' : '#ff3b30' }]}>
              {user.status === 'active' ? 'ใช้งานได้' : 'ไม่ใช้งาน'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>วันที่สร้าง:</Text>
            <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>แก้ไขล่าสุด:</Text>
            <Text style={styles.infoValue}>{formatDate(user.updatedAt)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.editButtonText}>แก้ไขข้อมูล</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelButton}>ยกเลิก</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>แก้ไขข้อมูลผู้ใช้</Text>
            <TouchableOpacity 
              onPress={handleEditUser}
              disabled={isUpdating}
            >
              <Text style={[styles.modalSaveButton, isUpdating && styles.disabledButton]}>
                {isUpdating ? 'กำลังบันทึก...' : 'บันทึก'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ชื่อ *</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.firstName}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, firstName: text }))}
                placeholder="กรอกชื่อ"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>นามสกุล *</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.lastName}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, lastName: text }))}
                placeholder="กรอกนามสกุล"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>อีเมล *</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                placeholder="กรอกอีเมล"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>รหัสผ่านใหม่ (ไม่บังคับ)</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.password}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, password: text }))}
                placeholder="กรอกรหัสผ่านใหม่หากต้องการเปลี่ยน"
                secureTextEntry
              />
              <Text style={styles.formHint}>หากไม่ต้องการเปลี่ยนรหัสผ่าน ให้เว้นว่างไว้</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    marginBottom: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 35,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  backButton: {
    padding: 5
  },
  backIcon: {
    fontSize: 24,
    color: '#007AFF'
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333'
  },
  placeholder: {
    width: 34
  },
  content: {
    flex: 1
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    marginBottom: 10
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 15
  },
  avatar: {
    width: '100%',
    height: '100%'
  },
  defaultAvatar: {
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  userRole: {
    fontSize: 16,
    color: '#666'
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    width: 120,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  bottomSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  modalCancelButton: {
    color: '#ff3b30',
    fontSize: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalSaveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  disabledButton: {
    color: '#ccc'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  formGroup: {
    marginBottom: 20
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  formHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5
  }
});

export default UserDetailScreen;
