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
import api, { API_URL } from '../../service/api';
import { UserProfile, UserInfoSection, EditUserButton } from '../../components_admin';

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
      
      // ใช้ api instance (มี interceptor ใส่ token อัตโนมัติ)
      const response = await api.get(`/users/${userId}`);
      console.log('✅ User data received:', response.data);
      console.log('📸 Avatar path:', response.data.avatar);
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
      if (error.response?.status === 401) {
        navigation.replace('Login');
      } else {
        Alert.alert('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        navigation.goBack();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    try {
      if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
        Alert.alert('ผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      setIsUpdating(true);

      const updateData = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim()
      };

      // เพิ่มรหัสผ่านเฉพาะเมื่อมีการกรอก
      if (editForm.password.trim()) {
        updateData.password = editForm.password.trim();
      }

      // ใช้ api instance
      await api.put(`/users/${userId}`, updateData);
      
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
        <UserProfile user={user} />
        <UserInfoSection user={user} />
      </ScrollView>

      <EditUserButton onPress={() => setShowEditModal(true)} />

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
