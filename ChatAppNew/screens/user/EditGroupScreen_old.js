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

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ชื่อกลุ่ม');
      return;
    }

    setIsLoading(true);
    try {
      // อัปเดตข้อมูลกลุ่ม
      const updateData = {
        groupName: groupName.trim(),
        description: description.trim(),
      };

      await api.put(`/groups/${groupId}`, updateData);

      // อัปเดตรูปกลุ่มถ้ามีการเปลี่ยน
      if (groupAvatar) {
        const formData = new FormData();
        formData.append('groupAvatar', {
          uri: groupAvatar.uri,
          type: 'image/jpeg',
          name: 'group-avatar.jpg',
        });

        await api.put(`/groups/${groupId}/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // อัปเดตสมาชิก - เพิ่มสมาชิกใหม่ (ถ้ามี)
      if (selectedUsers.length > 0) {
        const currentMemberIds = currentMembers.map(member => member._id);
        const selectedUserIds = selectedUsers.map(user => user._id);
        
        // หาสมาชิกใหม่ที่ต้องเพิ่ม
        const newMemberIds = selectedUserIds.filter(id => !currentMemberIds.includes(id));
        
        if (newMemberIds.length > 0) {
          await api.post(`/groups/${groupId}/members`, {
            userIds: newMemberIds
          });
        }
      }
      
      console.log('Group updated successfully');
      Alert.alert(
        'สำเร็จ',
        'อัปเดตกลุ่มสำเร็จแล้ว',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error updating group:', error);
      const errorMessage = error.response?.data?.message || 'ไม่สามารถอัปเดตกลุ่มได้';
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

  if (isLoadingGroup) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูลกลุ่ม...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขกลุ่ม</Text>
        <View style={styles.headerRightSpace} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {groupAvatar ? (
              <Image source={{ uri: groupAvatar.uri }} style={styles.groupAvatarImage} />
            ) : groupInfo?.groupAvatar ? (
              <Image 
                source={{ 
                  uri: groupInfo.groupAvatar.startsWith('http') 
                    ? groupInfo.groupAvatar 
                    : `${api.defaults.baseURL}${groupInfo.groupAvatar}` 
                }} 
                style={styles.groupAvatarImage} 
              />
            ) : (
              <View style={styles.defaultGroupAvatar}>
                <Text style={styles.avatarPlaceholder}>👥</Text>
              </View>
            )}
            <Text style={styles.avatarHint}>
              แตะเพื่อเปลี่ยนรูปกลุ่ม
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>ชื่อกลุ่ม</Text>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="ชื่อกลุ่ม"
            placeholderTextColor="#999"
            maxLength={50}
          />
        </View>

        {/* Update Group Button */}
        <View style={styles.createGroupButtonContainer}>
          <TouchableOpacity 
            onPress={handleUpdateGroup}
            disabled={isLoading || !groupName.trim()}
            style={[
              styles.createGroupButton,
              (isLoading || !groupName.trim()) && styles.createGroupButtonDisabled
            ]}
          >
            <Text style={[
              styles.createGroupButtonText,
              (isLoading || !groupName.trim()) && styles.createGroupButtonTextDisabled
            ]}>
              {isLoading ? 'กำลังอัปเดต...' : 'อัปเดตกลุ่ม'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={styles.loadingText}>กำลังอัปเดตกลุ่ม...</Text>
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  currentGroupInfo: {
    backgroundColor: '#E6B800',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D4A500',
  },
  currentGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  currentGroupContent: {
    gap: 8,
  },
  currentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  currentInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
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
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  currentMembersList: {
    backgroundColor: '#F0D000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
  noChangesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 16,
    backgroundColor: '#F0D000',
    borderRadius: 8,
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
  loadingText: {
    color: '#333',
    fontSize: 16,
    marginTop: 10,
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

export default EditGroupScreen;
