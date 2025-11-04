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
import api, { updateGroup, updateGroupAvatar, addGroupMembers, getGroupDetails, API_URL } from '../../service/api';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '../../components/LoadingOverlay';
import { AvatarImage } from '../../service/avatarUtils';
import SuccessTickAnimation from '../../components/SuccessTickAnimation';

const EditGroupScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const { user: authUser } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  
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
    loadMajors(); // อนุญาตให้ทุกคนเข้าถึง
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
      
      setShowSuccess(true);
      
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
      console.log('🖼️ Starting image selection...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📱 Media library permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('ข้อผิดพลาด', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
        return;
      }

      console.log('📸 Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('📸 Image picker result:', {
        canceled: result.canceled,
        hasAssets: result.assets ? result.assets.length : 0,
        firstAsset: result.assets?.[0] ? 'exists' : 'none'
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('✅ Setting group avatar:', {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height
        });
        setGroupAvatar(result.assets[0]);
      } else {
        console.log('❌ Image selection canceled or no assets');
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
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
        const nameResponse = await updateGroup(groupId, {
          groupName: groupName.trim(),
        });
        console.log('✅ Group name updated:', nameResponse.data);
      }

      // อัปเดตรูปภาพกลุ่ม (ถ้ามี)
      if (groupAvatar && groupAvatar.uri) {
        console.log('🖼️ Updating group avatar...', {
          uri: groupAvatar.uri,
          type: groupAvatar.type,
          fileName: groupAvatar.fileName
        });
        
        const formData = new FormData();
        formData.append('groupAvatar', {
          uri: groupAvatar.uri,
          type: 'image/jpeg',
          name: 'group-avatar.jpg',
        });

        console.log('📤 Sending FormData to updateGroupAvatar...');
        try {
          const avatarResponse = await updateGroupAvatar(groupId, formData);
          console.log('✅ Group avatar updated successfully:', avatarResponse.data);
          // รีเซ็ต state หลังอัปเดตสำเร็จ
          setGroupAvatar(null);
        } catch (avatarError) {
          console.error('❌ Avatar update error:', avatarError);
          console.error('❌ Avatar error response:', avatarError.response?.data);
          throw avatarError; // Re-throw to be caught by outer try-catch
        }
      }

      // อัปเดตสมาชิก (เพิ่มสมาชิกใหม่ และลบสมาชิกที่ไม่ได้เลือก)
      const currentMemberIds = currentMembers.map(member => member._id);
      const selectedUserIds = selectedUsers.map(user => user._id);
      const newMemberIds = selectedUserIds.filter(id => !currentMemberIds.includes(id));
      const removedMemberIds = currentMemberIds.filter(id => !selectedUserIds.includes(id) && id !== authUser._id);

      console.log('🔍 Member comparison:');
      console.log('Current members:', currentMemberIds);
      console.log('Selected users:', selectedUserIds);
      console.log('New members to add:', newMemberIds);
      console.log('Members to remove:', removedMemberIds);

      // เพิ่มสมาชิกใหม่
      if (newMemberIds.length > 0) {
        console.log('🔄 Adding new members:', newMemberIds);
        const addMembersResponse = await addGroupMembers(groupId, newMemberIds);
        console.log('✅ New members added:', addMembersResponse.data);
      }

      // ลบสมาชิกที่ไม่ได้เลือก (ยกเว้นตัวเอง)
      if (removedMemberIds.length > 0) {
        console.log('🔄 Removing members:', removedMemberIds);
        const { removeGroupMember } = await import('../../service/api');
        
        for (const memberId of removedMemberIds) {
          try {
            await removeGroupMember(groupId, memberId);
            console.log('✅ Member removed:', memberId);
          } catch (error) {
            console.error('❌ Error removing member:', memberId, error);
          }
        }
      }

      // โหลดข้อมูลกลุ่มใหม่หลังจากอัปเดต (บังคับ refresh)
      console.log('🔄 Force refreshing group data...');
      await loadGroupData();

      setShowSuccess(true);
      setTimeout(() => {
        // ส่ง flag กลับไปให้ parent screen รีเฟรช
        navigation.navigate('GroupChat', { 
          groupId, 
          refresh: true,
          updatedMembers: selectedUsers.length,
          forceRefresh: Date.now(), // เพิ่ม timestamp เพื่อบังคับ refresh
          avatarUpdated: true // บอกว่ามีการอัปเดตรูปภาพ
        });
      }, 1500);

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
        <AvatarImage 
          avatar={item.avatar} 
          name={displayName} 
          size={40} 
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

  return (
    <View style={styles.container}>
      <LoadingOverlay 
        visible={isLoadingGroup} 
        message="กำลังโหลดข้อมูลกลุ่ม..." 
      />
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
              defaultSource={require('../../assets/default-avatar.jpg')}
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
              <Text style={styles.addMemberButtonText1}>+ เพิ่มสมาชิก</Text>
            </TouchableOpacity>

            {(authUser.role === 'teacher' || authUser.role === 'อาจารย์') && (
              <TouchableOpacity
                style={[styles.addMemberButton, { backgroundColor: '#000000ff', borderColor: '#ffffffff' }]}
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
                  <AvatarImage 
                    avatar={user.avatar} 
                    name={displayName} 
                    size={32} 
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

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id?.toString()}
            renderItem={renderUserItem}
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
          />
          
          <LoadingOverlay 
            visible={loadingUsers} 
            message="กำลังโหลดรายชื่อผู้ใช้..." 
          />
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
              <Text style={styles.closeButtonText}>กลับ</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสาขา</Text>
            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={majors}
            keyExtractor={(item, index) => `major-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.majorItem}
                onPress={() => loadClassCodesByMajor(item.major)}
              >
                <View style={styles.majorTextContainer}>
                  <Text style={styles.majorText}>
                    {typeof item.major === 'object' ? item.major.name : item.major}
                  </Text>
                  <Text style={styles.majorSubText}>
                    {item.userCount} คน ในสาขานี้
                  </Text>
                </View>
                <Text style={styles.arrowText}>→</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
          
          <LoadingOverlay 
            visible={loadingMajors} 
            message="กำลังโหลดรายชื่อสาขา..." 
          />
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
              <Text style={styles.closeButtonText}>← </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกกลุ่มเรียน - {selectedMajor}</Text>
            <TouchableOpacity 
              onPress={() => setShowClassSelection(false)}
              style={styles.closeButton}
            >
              
            </TouchableOpacity>
          </View>

          <FlatList
            data={classCodes}
            keyExtractor={(item, index) => `class-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.classItem}
                onPress={() => addUsersByClassCode(item.classCode)}
              >
                <View style={styles.classTextContainer}>
                  <Text style={styles.classText}>
                    {item.classCode || 'ไม่มีรหัสกลุ่มเรียน'}
                  </Text>
                  <Text style={styles.classSubText}>
                    {item.userCount} คน
                  </Text>
                </View>
                <Text style={styles.addText}>+ เพิ่ม</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
          
          <LoadingOverlay 
            visible={loadingClassCodes} 
            message="กำลังโหลดกลุ่มเรียน..." 
          />
        </View>
      </Modal>

      <SuccessTickAnimation
        visible={showSuccess}
        onComplete={() => setShowSuccess(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
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
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#333',
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
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#cccccc',
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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#ffffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000ff',
    flex: 1,
  },
  addMemberButtonText1: {
    color: '#000000ff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  addMemberButtonText: {
    color: '#ffffffff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#000000ff',
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
    backgroundColor: '#ffffffff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffffff',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000ff',
  },
  closeButton: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#000000ff',
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
    fontSize: 16,
    color: '#0e0d0dff',
    borderWidth: 1,
    borderColor: '#000000ff',
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
    backgroundColor: '#cacacaff',
    borderRadius: 8,
  },
  selectedUserItem: {
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  majorTextContainer: {
    flex: 1,
  },
  majorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  majorSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    backgroundColor: '#fffffeff',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  classTextContainer: {
    flex: 1,
  },
  classText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  classSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default EditGroupScreen;
