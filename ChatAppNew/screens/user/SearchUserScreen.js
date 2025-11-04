import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { searchUsers, createPrivateChat } from '../../service/api';
import { useAuth } from '../../context/AuthContext';
import api, { API_URL } from '../../service/api';
import { AvatarImage } from '../../service/avatarUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Removed loading import - no longer using loading functionality
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import TabBar from '../../components_user/TabBar';

const SearchUserScreen = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [chatCreationLoading, setChatCreationLoading] = useState(false);

  // Real-time search with debounce เหมือนหน้าเดิม
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
        setError(null);
      }
    }, 500); // รอ 500ms หลังจากหยุดพิมพ์

    return () => clearTimeout(timeoutId);
  }, [query]);

  // ค้นหาผู้ใช้
  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setResults([]); // Clear ผลลัพธ์เก่า
    setError(null);

    try {
      console.log('Searching with query:', query);
      const response = await searchUsers(query.trim());
      console.log('Search results:', response.data);
      console.log('Results array length:', response.data?.length);
      
      setResults(response.data || []);
      
      if (!response.data || response.data.length === 0) {
        setError('ไม่พบผู้ใช้ที่ค้นหา');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('เกิดข้อผิดพลาดในการค้นหา');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openProfileModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    console.log('Closing modal...');
    setShowModal(false);
    // รอให้ modal animation เสร็จก่อนเคลียร์ selectedUser
    setTimeout(() => {
      setSelectedUser(null);
    }, 300);
  };

  const createChatRoom = async (selectedUser) => {
    console.log('🚀 createChatRoom - Fast version');
    
    if (!selectedUser || !selectedUser._id) {
      Alert.alert('ข้อผิดพลาด', 'ข้อมูลผู้ใช้ไม่ครบถ้วน');
      return;
    }

    // ใช้ข้อมูล currentUser ที่มีอยู่แล้วจาก AuthContext แทนการเรียก API
    if (!currentUser || !currentUser._id) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      navigation.replace('Login');
      return;
    }

    setChatCreationLoading(true);
    
    try {
      console.log('✅ Creating chat between:', currentUser._id, 'and', selectedUser._id);
      
      // เรียก API เพียงครั้งเดียว พร้อม timeout สั้นลง
      const response = await Promise.race([
        createPrivateChat([currentUser._id, selectedUser._id]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000) // ลดเหลือ 5 วินาที
        )
      ]);
      
      console.log('✅ Chat created/found:', response.chatroomId);
      
      // ปิด loading และ modal ก่อน navigate
      setChatCreationLoading(false);
      closeModal();
      
      // Navigate ทันทีโดยไม่ต้องรอ
      const chatParams = {
        chatroomId: response.chatroomId,
        roomName: response.roomName || `${selectedUser.firstName} ${selectedUser.lastName}`,
        recipientId: selectedUser._id,
        recipientName: `${selectedUser.firstName} ${selectedUser.lastName}`,
        recipientAvatar: selectedUser.avatar
      };

      // Navigate ตรงไปยัง PrivateChat เลย
      navigation.navigate('PrivateChat', chatParams);
      
    } catch (error) {
      setChatCreationLoading(false);
      console.error('Error creating chat:', error);
      
      let errorMessage = 'ไม่สามารถสร้างแชทได้';
      if (error.message === 'Timeout') {
        errorMessage = 'การเชื่อมต่อช้าเกินไป กรุณาลองใหม่';
      } else if (error.response?.status === 500) {
        errorMessage = 'เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง';
      }
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
    }
  };

  // แสดงผลผู้ใช้แต่ละคน
  const renderUser = ({ item }) => {
    console.log('Rendering user:', item); // Debug log
    
    if (!item || !item._id) {
      return null; // Skip rendering if item is invalid
    }
    
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => openProfileModal(item)}
      >
        <View style={styles.avatarContainer}>
          <AvatarImage
            avatarPath={item.avatar}
            firstName={item.firstName}
            lastName={item.lastName}
            size={50}
            style={styles.avatar}
          />
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.firstName || ''} {item.lastName || ''}
          </Text>
          <Text style={styles.userDetails}>
            {item.faculty ? (typeof item.faculty === 'object' ? item.faculty.name : item.faculty) : ''} 
            {item.faculty && item.major ? ' - ' : ''}
            {item.major ? (typeof item.major === 'object' ? item.major.name : item.major) : ''}
          </Text>
          {item.role && (
            <Text style={styles.userRole}>
              {item.role === 'student' ? 'นักศึกษา' : 
               item.role === 'teacher' ? 'อาจารย์' : 
               item.role === 'admin' ? 'ผู้ดูแลระบบ' : 
               item.role === 'staff' ? 'เจ้าหน้าที่' : item.role}
            </Text>
          )}
        </View>
        
        <View style={styles.chevronContainer}>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    if (!query.trim()) {
      return (
        <View style={styles.emptyState}>
          <LottieView
            source={require('../../assets/Free Searching Animation.json')}
            autoPlay
            loop
            style={styles.searchAnimation}
          />
          <Text style={styles.emptyText}>พิมพ์ชื่อหรือนามสกุลเพื่อค้นหาผู้ใช้</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="error-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ค้นหาผู้ใช้</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ชื่อ, นามสกุล หรือ username"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {isLoading && (
          <ActivityIndicator size="small" color="#666" style={styles.loadingIcon} />
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.listContainer}
      />

      {/* Profile Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={closeModal}
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
              <Text style={styles.cancelButton}>ปิด</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ข้อมูลผู้ใช้</Text>
            <View style={styles.placeholder} />
          </View>

          {selectedUser && selectedUser._id && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.profileSection}>
                <View style={styles.profileAvatarContainer}>
                  <AvatarImage
                    avatarPath={selectedUser.avatar}
                    firstName={selectedUser.firstName}
                    lastName={selectedUser.lastName}
                    size={80}
                    style={styles.profileAvatar}
                  />
                </View>
                
                <Text style={styles.profileName}>
                  {selectedUser.firstName || ''} {selectedUser.lastName || ''}
                </Text>
                
                <Text style={styles.profileRole}>
                  {selectedUser.role === 'student' ? 'นักศึกษา' : 
                   selectedUser.role === 'teacher' ? 'อาจารย์' : 
                   selectedUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 
                   selectedUser.role === 'staff' ? 'เจ้าหน้าที่' : selectedUser.role}
                </Text>
              </View>

              <View style={styles.infoSection}>
                {/* ซ่อนอีเมลสำหรับเจ้าหน้าที่ */}
                {selectedUser.role !== 'staff' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>อีเมล</Text>
                    <Text style={styles.infoValue}>{selectedUser.email || 'ไม่ระบุ'}</Text>
                  </View>
                )}
                
                {/* ซ่อนคณะสำหรับเจ้าหน้าที่ */}
                {selectedUser.role !== 'staff' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>คณะ</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.faculty 
                        ? (typeof selectedUser.faculty === 'object' ? selectedUser.faculty.name : selectedUser.faculty)
                        : 'ไม่ระบุ'
                      }
                    </Text>
                  </View>
                )}
                
                {/* ซ่อนสาขาสำหรับเจ้าหน้าที่ */}
                {selectedUser.role !== 'staff' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>สาขา</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.major 
                        ? (typeof selectedUser.major === 'object' ? selectedUser.major.name : selectedUser.major)
                        : 'ไม่ระบุ'
                      }
                    </Text>
                  </View>
                )}
                
                {/* ซ่อนรหัสกลุ่มสำหรับเจ้าหน้าที่และอาจารย์ */}
                {selectedUser.role !== 'staff' && selectedUser.role !== 'teacher' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>รหัสกลุ่ม</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser.groupCode 
                        ? (typeof selectedUser.groupCode === 'object' ? selectedUser.groupCode.name : selectedUser.groupCode)
                        : 'ไม่ระบุ'
                      }
                    </Text>
                  </View>
                )}

                {selectedUser.studentId && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>รหัสนักศึกษา</Text>
                    <Text style={styles.infoValue}>{selectedUser.studentId}</Text>
                  </View>
                )}

                {selectedUser.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>เบอร์โทร</Text>
                    <Text style={styles.infoValue}>{selectedUser.phone}</Text>
                  </View>
                )}

                {selectedUser.bio && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>ข้อมูลเพิ่มเติม</Text>
                    <Text style={styles.infoValue}>{selectedUser.bio}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.chatButton, chatCreationLoading && styles.chatButtonDisabled]}
                activeOpacity={0.7}
                delayPressIn={0}
                disabled={chatCreationLoading}
                onPress={() => {
                  console.log('Chat button pressed for:', selectedUser._id);
                  createChatRoom(selectedUser);
                }}
              >
                {chatCreationLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.chatButtonText}>กำลังเข้าแชท...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="chat" size={24} color="#fff" />
                    <Text style={styles.chatButtonText}>แชท</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Removed LoadingModal - no longer using loading functionality */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    paddingTop: 50,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSecondary,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.sm + 4,
    borderRadius: RADIUS.sm + 4,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
  },
  loadingIcon: {
    marginLeft: SPACING.sm,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  searchAnimation: {
    width: 200,
    height: 200,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textTertiary,
    marginTop: SPACING.md,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.error,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 4,
    borderRadius: RADIUS.sm + 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  avatarContainer: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userDetails: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
    lineHeight: 18,
  },
  userRole: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.accent,
    fontWeight: '600',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  chevronContainer: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileAvatarContainer: {
    marginBottom: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileDefaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  profileRole: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoSection: {
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm + 4,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  chatButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#999',
  },
  chatButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});

const SearchUserScreenWithTabBar = (props) => {
  return (
    <>
      <SearchUserScreen {...props} />
      <TabBar navigation={props.navigation} activeTab="Search" />
    </>
  );
};

export default SearchUserScreenWithTabBar;
