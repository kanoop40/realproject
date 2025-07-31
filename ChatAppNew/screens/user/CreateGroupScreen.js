import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../service/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const CreateGroupScreen = ({ navigation }) => {
  const { user: authUser } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [showClassSelection, setShowClassSelection] = useState(false);
  const [showMajorSelection, setShowMajorSelection] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [classCodes, setClassCodes] = useState([]);
  const [majors, setMajors] = useState([]);
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [loadingClassCodes, setLoadingClassCodes] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);

  useEffect(() => {
    loadUsers();
    if (authUser.role === 'teacher' || authUser.role === 'อาจารย์') {
      loadMajors();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users/for-group');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadMajors = async () => {
    try {
      setLoadingMajors(true);
      const response = await api.get('/users/majors');
      setMajors(response.data || []);
    } catch (error) {
      console.error('Error loading majors:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดรายชื่อสาขาได้');
    } finally {
      setLoadingMajors(false);
    }
  };

  const loadClassCodesByMajor = async (major) => {
    try {
      setLoadingClassCodes(true);
      const response = await api.get(`/users/class-codes-by-major/${encodeURIComponent(major)}`);
      console.log('Class codes response:', response.data);
      setClassCodes(response.data || []);
      setSelectedMajor(major);
      setShowMajorSelection(false);
      setShowClassSelection(true);
    } catch (error) {
      console.error('Error loading class codes:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดรหัสกลุ่มเรียนได้');
    } finally {
      setLoadingClassCodes(false);
    }
  };

  const addUsersByClassCode = async (classCode) => {
    try {
      console.log('Adding users by class code:', classCode);
      
      if (!classCode || classCode === 'null' || classCode === null) {
        Alert.alert('ข้อผิดพลาด', 'รหัสกลุ่มเรียนไม่ถูกต้อง');
        return;
      }
      
      const response = await api.get(`/users/by-class/${classCode}`);
      const classUsers = response.data || [];
      
      console.log('Users from class:', classUsers);
      
      // เพิ่มผู้ใช้ที่ยังไม่ได้เลือกเท่านั้น
      const newUsers = classUsers.filter(classUser => 
        !selectedUsers.find(selected => selected._id === classUser._id) &&
        classUser._id !== authUser._id // ไม่รวมตัวเอง
      );
      
      console.log('New users to add:', newUsers.length);
      
      setSelectedUsers(prev => [...prev, ...newUsers]);
      setShowClassSelection(false);
      
      Alert.alert(
        'สำเร็จ',
        `เพิ่มสมาชิกจากกลุ่มเรียน ${classCode} จำนวน ${newUsers.length} คน`
      );
    } catch (error) {
      console.error('Error adding users by class code:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มสมาชิกจากกลุ่มเรียนได้');
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('ข้อผิดพลาด', 'ต้องอนุญาตการเข้าถึงรูปภาพก่อน');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setGroupAvatar(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ชื่อกลุ่ม');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาเลือกสมาชิกอย่างน้อย 1 คน');
      return;
    }

    setIsLoading(true);
    try {
      // สร้าง FormData สำหรับส่งข้อมูลรวมรูปภาพ
      const formData = new FormData();
      
      // สร้างสมาชิกรวมตัวเอง
      const members = [
        { user: authUser._id, role: 'admin' },
        ...selectedUsers.map(user => ({ user: user._id, role: 'member' }))
      ];

      formData.append('groupName', groupName.trim());
      formData.append('description', description.trim());
      formData.append('members', JSON.stringify(members));

      // เพิ่มรูปภาพถ้ามี
      if (groupAvatar) {
        formData.append('groupAvatar', {
          uri: groupAvatar.uri,
          type: 'image/jpeg',
          name: 'group-avatar.jpg',
        });
      }

      console.log('Creating group with FormData');
      const response = await api.post('/groups', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Group created successfully:', response.data);
      Alert.alert(
        'สำเร็จ',
        'สร้างกลุ่มสำเร็จแล้ว',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              // กลับไปหน้าแชทและรีเฟรชรายการ
              navigation.navigate('Chat', { refresh: true });
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error creating group:', error);
      const errorMessage = error.response?.data?.message || 'ไม่สามารถสร้างกลุ่มได้';
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.find(u => u._id === item._id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item)}
      >
        <Image
          source={
            item.avatar
              ? { uri: `${api.defaults.baseURL}/${item.avatar.replace(/\\/g, '/')}` }
              : require('../../assets/default-avatar.png')
          }
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.userRole}>{item.role}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สร้างกลุ่ม</Text>
        <View style={styles.headerRightSpace} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {groupAvatar ? (
              <Image source={{ uri: groupAvatar.uri }} style={styles.groupAvatarImage} />
            ) : (
              <View style={styles.defaultGroupAvatar}>
                <Text style={styles.avatarPlaceholder}>👥</Text>
              </View>
            )}
            <Text style={styles.avatarHint}>
              {groupAvatar ? 'แตะเพื่อเปลี่ยนรูป' : 'แตะเพื่อเพิ่มรูปกลุ่ม'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Name Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="ชื่อกลุ่ม"
            placeholderTextColor="#999"
            maxLength={50}
          />
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>สมาชิก ({selectedUsers.length + 1})</Text>
          
          {/* Add Member Buttons */}
          <View style={styles.addMemberButtonsContainer}>
            <TouchableOpacity
              style={styles.addMemberButton}
              onPress={() => setShowUserSelection(true)}
            >
              <View style={styles.addMemberIcon}>
                <Text style={styles.addMemberIconText}>+</Text>
              </View>
              <Text style={styles.addMemberButtonLabel}>เพิ่มสมาชิก</Text>
            </TouchableOpacity>

            {/* ปุ่มสำหรับอาจารย์เท่านั้น */}
            {(authUser.role === 'อาจารย์' || authUser.role === 'teacher') && (
              <TouchableOpacity
                style={[styles.addMemberButton, styles.addClassButton]}
                onPress={() => setShowMajorSelection(true)}
              >
                <View style={[styles.addMemberIcon, styles.addClassIcon]}>
                  <Text style={styles.addMemberIconText}>👥</Text>
                </View>
                <Text style={styles.addMemberButtonLabel}>เพิ่มจากกลุ่มเรียน</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Selected Members Display */}
          <View style={styles.selectedMembersContainer}>
            {/* Current User (Always included) */}
            <View style={styles.memberItem}>
              <Image
                source={
                  authUser.avatar
                    ? { uri: `${api.defaults.baseURL}/${authUser.avatar.replace(/\\/g, '/')}` }
                    : require('../../assets/default-avatar.png')
                }
                style={styles.memberAvatar}
              />
              <Text style={styles.memberName}>
                {authUser.firstName} {authUser.lastName} (คุณ)
              </Text>
            </View>

            {/* Selected Users */}
            {selectedUsers.map((user) => (
              <View key={user._id} style={styles.memberItem}>
                <Image
                  source={
                    user.avatar
                      ? { uri: `${api.defaults.baseURL}/${user.avatar.replace(/\\/g, '/')}` }
                      : require('../../assets/default-avatar.png')
                  }
                  style={styles.memberAvatar}
                />
                <Text style={styles.memberName}>
                  {user.firstName} {user.lastName}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleUserSelection(user)}
                  style={styles.removeMemberButton}
                >
                  <Text style={styles.removeMemberButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Create Group Button */}
        <View style={styles.createGroupButtonContainer}>
          <TouchableOpacity 
            onPress={handleCreateGroup}
            disabled={isLoading || !groupName.trim() || selectedUsers.length === 0}
            style={[
              styles.createGroupButton,
              (isLoading || !groupName.trim() || selectedUsers.length === 0) && styles.createGroupButtonDisabled
            ]}
          >
            <Text style={[
              styles.createGroupButtonText,
              (isLoading || !groupName.trim() || selectedUsers.length === 0) && styles.createGroupButtonTextDisabled
            ]}>
              {isLoading ? 'กำลังสร้าง...' : 'สร้างกลุ่ม'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Major Selection Modal */}
      <Modal
        visible={showMajorSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMajorSelection(false)}>
              <Text style={styles.modalHeaderButton}>ยกเลิก</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>เลือกสาขา</Text>
            <View style={styles.placeholder} />
          </View>

          {loadingMajors ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFA500" />
              <Text>กำลังโหลดสาขา...</Text>
            </View>
          ) : (
            <FlatList
              data={majors}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.classCodeItem}
                  onPress={() => loadClassCodesByMajor(item.major)}
                >
                  <View style={styles.classCodeInfo}>
                    <Text style={styles.classCodeText}>{item.major}</Text>
                    <Text style={styles.classCodeCount}>
                      รหัสกลุ่มเรียน {item.classCodeCount} กลุ่ม
                    </Text>
                  </View>
                  <Text style={styles.classCodeArrow}>→</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.major}
              style={styles.classCodesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Class Selection Modal */}
      <Modal
        visible={showClassSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowClassSelection(false);
              setShowMajorSelection(true);
            }}>
              <Text style={styles.modalHeaderButton}>← กลับ</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {selectedMajor ? `${selectedMajor}` : 'เลือกกลุ่มเรียน'}
            </Text>
            <TouchableOpacity onPress={() => setShowClassSelection(false)}>
              <Text style={styles.modalHeaderButton}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>

          {loadingClassCodes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFA500" />
              <Text>กำลังโหลดกลุ่มเรียน...</Text>
            </View>
          ) : (
            <FlatList
              data={classCodes.filter(item => item.classCode && item.classCode !== null)}
              renderItem={({ item }) => {
                console.log('Class code item:', item);
                return (
                  <TouchableOpacity
                    style={styles.classCodeItem}
                    onPress={() => addUsersByClassCode(item.classCode)}
                  >
                    <View style={styles.classCodeInfo}>
                      <Text style={styles.classCodeText}>
                        {item.classCode}
                      </Text>
                      <Text style={styles.classCodeCount}>
                        สมาชิก {item.userCount || 0} คน
                      </Text>
                    </View>
                    <Text style={styles.classCodeArrow}>+</Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item, index) => item.classCode || index.toString()}
              style={styles.classCodesList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>ไม่พบรหัสกลุ่มเรียนในสาขานี้</Text>
                  <Text style={styles.emptySubText}>ผู้ใช้ในสาขานี้อาจยังไม่ได้ระบุรหัสกลุ่มเรียน</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* User Selection Modal */}
      <Modal
        visible={showUserSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUserSelection(false)}>
              <Text style={styles.modalHeaderButton}>เสร็จ</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>เลือกสมาชิก</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="ค้นหาชื่อผู้ใช้"
              placeholderTextColor="#999"
            />
          </View>

          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFA500" />
              <Text>กำลังโหลดรายชื่อผู้ใช้...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id}
              style={styles.usersList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={styles.loadingText}>กำลังสร้างกลุ่ม...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5C842',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#F5C842',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRightSpace: {
    width: 40, // Same width as back button for centering
  },
  createButton: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#999',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#ccc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  defaultGroupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6B800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    fontSize: 32,
    color: '#fff',
  },
  avatarHint: {
    fontSize: 14,
    color: '#666',
  },
  inputSection: {
    marginBottom: 24,
  },
  groupNameInput: {
    backgroundColor: '#E6B800',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#D4A500',
  },
  membersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  addMemberButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addMemberButton: {
    backgroundColor: '#E6B800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4A500',
    flex: 1,
  },
  addClassButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  addMemberIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addClassIcon: {
    backgroundColor: '#fff',
  },
  addMemberIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addMemberButtonLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedMembersContainer: {
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  removeMemberButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMemberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createGroupButtonContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  createGroupButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupButtonDisabled: {
    backgroundColor: '#999',
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createGroupButtonTextDisabled: {
    color: '#ccc',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionInput: {
    backgroundColor: '#E6B800',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#D4A500',
    height: 80,
    textAlignVertical: 'top',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5C842',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#F5C842',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalHeaderButton: {
    fontSize: 16,
    color: '#FFA500',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInput: {
    backgroundColor: '#E6B800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#D4A500',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
  },
  userItemSelected: {
    backgroundColor: '#FFA500',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#FFA500',
    fontSize: 16,
    fontWeight: 'bold',
  },
  classCodesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  classCodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
  },
  classCodeInfo: {
    flex: 1,
  },
  classCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  classCodeCount: {
    fontSize: 14,
    color: '#666',
  },
  classCodeArrow: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CreateGroupScreen;
