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
  
  // User management states
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
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
    loadGroupData();
    loadUsers();
    if (authUser.role === 'teacher' || authUser.role === 'อาจารย์') {
      loadMajors();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setIsLoadingGroup(true);
      const response = await api.get(`/groups/${groupId}`);
      const group = response.data;
      
      console.log('📋 Group data loaded:', group);
      
      setGroupInfo(group);
      setGroupName(group.groupName || '');
      
      // โหลดข้อมูลสมาชิกปัจจุบัน
      const membersResponse = await api.get(`/groups/${groupId}/members`);
      const members = membersResponse.data || [];
      console.log('👥 Current members:', members);
      
      // แยกสมาชิกที่ไม่ใช่ตัวเอง
      const otherMembers = members.filter(member => member._id !== authUser._id);
      setCurrentMembers(members);
      setSelectedUsers(otherMembers);
      
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
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มสมาชิกจากรหัสกลุ่มเรียนได้');
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedUsers.find(selected => selected._id === user._id) && // ไม่แสดงคนที่เลือกแล้ว
    user._id !== authUser._id // ไม่แสดงตัวเอง
  );

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

  const handleUpdateGroup = async () => {
    // ไม่บังคับต้องมีชื่อกลุ่มใหม่ เพราะอาจจะแค่เพิ่มสมาชิก
    const hasChanges = (
      (groupName.trim() && groupName.trim() !== groupInfo?.groupName) || // เปลี่ยนชื่อ
      (groupAvatar && groupAvatar.uri) || // เปลี่ยนรูป
      (selectedUsers.length !== currentMembers.filter(member => member._id !== authUser._id).length) // เปลี่ยนสมาชิก
    );

    if (!hasChanges) {
      Alert.alert('แจ้งเตือน', 'ไม่มีการเปลี่ยนแปลงข้อมูล');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Updating group...');

      // อัปเดตชื่อกลุ่ม (ถ้ามีการเปลี่ยนแปลง)
      if (groupName.trim() && groupName.trim() !== groupInfo?.groupName) {
        const nameResponse = await api.put(`/groups/${groupId}`, {
          groupName: groupName.trim(),
        });
        console.log('✅ Group name updated:', nameResponse.data);
      }

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

      // อัปเดตสมาชิก (เพิ่มสมาชิกใหม่)
      const currentMemberIds = currentMembers.map(member => member._id);
      const selectedUserIds = selectedUsers.map(user => user._id);
      const newMemberIds = selectedUserIds.filter(id => !currentMemberIds.includes(id));

      if (newMemberIds.length > 0) {
        console.log('🔄 Adding new members:', newMemberIds);
        const addMembersResponse = await api.post(`/groups/${groupId}/invite`, {
          userIds: newMemberIds
        });
        console.log('✅ New members added:', addMembersResponse.data);
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

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.find(u => u._id === item._id);
    const displayName = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleUserSelection(item)}
      >
        <Image
          source={{
            uri: item.avatar?.startsWith('http') 
              ? item.avatar 
              : item.avatar 
                ? `${API_URL}${item.avatar}`
                : 'https://via.placeholder.com/40'
          }}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        {isSelected && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
    );
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขกลุ่ม</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={selectAvatarImage}>
            <Image
              source={{
                uri: groupAvatar?.uri ||
                     (groupInfo?.groupAvatar?.startsWith('http') 
                       ? groupInfo.groupAvatar 
                       : groupInfo?.groupAvatar 
                         ? `${API_URL}${groupInfo.groupAvatar}`
                         : 'https://via.placeholder.com/80')
              }}
              style={styles.avatar}
            />
            <Text style={styles.avatarHint}>
              {groupAvatar || groupInfo?.groupAvatar ? 'แตะเพื่อเปลี่ยนรูป' : 'แตะเพื่อเพิ่มรูปกลุ่ม'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Name Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="ชื่อกลุ่ม"
            placeholderTextColor="#999"
            maxLength={50}
          />
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>สมาชิก ({selectedUsers.length} คน)</Text>
          
          {/* Add Members Buttons */}
          <View style={styles.addMembersButtons}>
            <TouchableOpacity
              style={styles.addMemberButton}
              onPress={() => setShowUserSelection(true)}
            >
              <Text style={styles.addMemberButtonText}>+ เพิ่มสมาชิก</Text>
            </TouchableOpacity>

            {(authUser.role === 'teacher' || authUser.role === 'อาจารย์') && (
              <TouchableOpacity
                style={[styles.addMemberButton, { backgroundColor: '#4CAF50', borderColor: '#45a049' }]}
                onPress={() => setShowMajorSelection(true)}
              >
                <Text style={styles.addMemberButtonText}>เพิ่มจากกลุ่มเรียน</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Selected Members Display */}
          <View style={styles.selectedMembersContainer}>
            {selectedUsers.map((user) => {
              const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
              return (
                <View key={user._id} style={styles.selectedMemberChip}>
                  <Image
                    source={{
                      uri: user.avatar?.startsWith('http') 
                        ? user.avatar 
                        : user.avatar 
                          ? `${API_URL}${user.avatar}`
                          : 'https://via.placeholder.com/32'
                    }}
                    style={styles.selectedMemberAvatar}
                  />
                  <Text style={styles.selectedMemberName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => toggleUserSelection(user)}
                    style={styles.removeChipButton}
                  >
                    <Text style={styles.removeChipText}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Update Button */}
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[styles.updateButton, isLoading && styles.updateButtonDisabled]}
            onPress={handleUpdateGroup}
            disabled={isLoading}
          >
            <Text style={styles.updateButtonText}>
              {isLoading ? 'กำลังอัปเดต...' : 'อัปเดตกลุ่ม'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* User Selection Modal */}
      <Modal
        visible={showUserSelection}
        animationType="slide"
        onRequestClose={() => setShowUserSelection(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowUserSelection(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>เสร็จ</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสมาชิก</Text>
            <View style={styles.placeholder} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาชื่อสมาชิก..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text>กำลังโหลดรายชื่อผู้ใช้...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id?.toString()}
              renderItem={renderUserItem}
              style={styles.usersList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Major Selection Modal */}
      <Modal
        visible={showMajorSelection}
        animationType="slide"
        onRequestClose={() => setShowMajorSelection(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowMajorSelection(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสาขา</Text>
            <View style={styles.placeholder} />
          </View>

          {loadingMajors ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text>กำลังโหลดรายชื่อสาขา...</Text>
            </View>
          ) : (
            <FlatList
              data={majors}
              keyExtractor={(item, index) => `major-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.majorItem}
                  onPress={() => loadClassCodesByMajor(item)}
                >
                  <Text style={styles.majorText}>{item}</Text>
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Class Selection Modal */}
      <Modal
        visible={showClassSelection}
        animationType="slide"
        onRequestClose={() => setShowClassSelection(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowClassSelection(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>← กลับ</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกกลุ่มเรียน - {selectedMajor}</Text>
            <TouchableOpacity 
              onPress={() => setShowClassSelection(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>

          {loadingClassCodes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text>กำลังโหลดกลุ่มเรียน...</Text>
            </View>
          ) : (
            <FlatList
              data={classCodes}
              keyExtractor={(item, index) => `class-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.classItem}
                  onPress={() => addUsersByClassCode(item)}
                >
                  <Text style={styles.classText}>{item || 'ไม่มีรหัสกลุ่มเรียน'}</Text>
                  <Text style={styles.addText}>+ เพิ่ม</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5C842',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5C842',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6B800',
    marginBottom: 8,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFA500',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 12,
    color: '#fff',
  },
  avatarHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 24,
  },
  input: {
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
  selectedMembersContainer: {
    marginTop: 8,
  },
  selectedMembersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  selectedMembersScroll: {
    maxHeight: 100,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  selectedMemberName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  removeChipButton: {
    marginLeft: 6,
    padding: 2,
  },
  removeChipText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 18,
  },
  addMembersButtons: {
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
  addMemberButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  updateButtonDisabled: {
    backgroundColor: '#999',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5C842',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F5C842',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FFA500',
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#E6B800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
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
    marginBottom: 8,
    backgroundColor: '#E6B800',
    borderRadius: 8,
  },
  selectedUserItem: {
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
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkMark: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  majorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  majorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  arrowText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#E6B800',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  classText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '600',
  },
  addText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default EditGroupScreen;
