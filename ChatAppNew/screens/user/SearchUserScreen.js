import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { searchUsers, createPrivateChat } from '../../service/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_URL } from '../../service/api'; // ใช้ API_URL เดียวกัน
import { AuthContext } from '../../context/AuthContext';

const SearchUserScreen = ({ navigation }) => {
  // Add safety check for context and navigation
  let user = null;
  try {
    const authContext = useContext(AuthContext);
    user = authContext?.user || null;
  } catch (error) {
    console.log('AuthContext error:', error);
  }

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Add safety check for navigation
  if (!navigation) {
    return (
      <View style={styles.container}>
        <Text>Navigation Error</Text>
      </View>
    );
  }

  // Real-time search with debounce
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

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Searching with query:', query);
      
      const response = await searchUsers(query);
      console.log('Search results:', response.data);
      
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
    setShowModal(false);
    setSelectedUser(null);
  };

  const createChatRoom = async (selectedUser) => {
    try {
      console.log('Starting createChatRoom with selectedUser:', selectedUser);
      
      if (!selectedUser || !selectedUser._id) {
        Alert.alert('ข้อผิดพลาด', 'ข้อมูลผู้ใช้ไม่ครบถ้วน');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบ Token กรุณาเข้าสู่ระบบใหม่');
        navigation.replace('Login');
        return;
      }

      Alert.alert(
        'สร้างแชท',
        `ต้องการเริ่มแชทกับ ${selectedUser.firstName} ${selectedUser.lastName} หรือไม่?`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { 
            text: 'ตกลง', 
            onPress: async () => {
              try {
                closeModal();
                
                // ดึงข้อมูลผู้ใช้ปัจจุบันจาก API เพื่อให้แน่ใจว่าถูกต้อง
                console.log('Getting current user from API...');
                const currentUserResponse = await api.get('/users/current');
                const currentUser = currentUserResponse.data;
                
                console.log('Current user from API:', currentUser);
                console.log('Creating private chat between:', currentUser._id, 'and', selectedUser._id);
                
                // สร้างหรือดึงแชทส่วนตัว
                const response = await createPrivateChat([currentUser._id, selectedUser._id]);
                
                console.log('Private chat response:', response);
                
                if (response.existing) {
                  console.log('📱 Using existing chat:', response.chatroomId);
                  Alert.alert('ห้องแชทมีอยู่แล้ว', 'เปิดห้องแชทที่มีอยู่แล้ว');
                } else {
                  console.log('🆕 Created new chat:', response.chatroomId);
                  Alert.alert('สร้างห้องแชทสำเร็จ', 'เปิดห้องแชทใหม่');
                }
                
                // นำทางไปยังหน้าแชทส่วนตัว
                navigation.navigate('PrivateChat', {
                  chatroomId: response.chatroomId,
                  roomName: response.roomName,
                  recipientId: selectedUser._id,
                  recipientName: `${selectedUser.firstName} ${selectedUser.lastName}`,
                  recipientAvatar: selectedUser.avatar
                });
                
              } catch (error) {
                console.error('Error creating chat:', error);
                console.error('Error details:', {
                  message: error.message,
                  response: error.response?.data,
                  status: error.response?.status
                });
                Alert.alert('ข้อผิดพลาด', `ไม่สามารถสร้างแชทได้: ${error.message || 'กรุณาลองใหม่'}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in createChatRoom:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถสร้างแชทได้');
    }
  };

  const renderUser = ({ item }) => {
    if (!item || !item._id) {
      return null; // Skip rendering if item is invalid
    }
    
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => openProfileModal(item)}
      >
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image 
              source={{ uri: `${API_URL}/${item.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}` }} 
              style={styles.avatar} 
              defaultSource={require('../../assets/default-avatar.png')}
              onError={(error) => console.log('Avatar load error:', error)}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {item.firstName ? item.firstName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.firstName || ''} {item.lastName || ''}
          </Text>
          <Text style={styles.userDetails}>
            {item.faculty || ''} - {item.major || ''}
          </Text>
          <Text style={styles.userRole}>
            {item.role === 'student' ? 'นักศึกษา' : 
             item.role === 'teacher' ? 'อาจารย์' : 
             item.role === 'admin' ? 'ผู้ดูแลระบบ' : 
             item.role === 'staff' ? 'เจ้าหน้าที่' : item.role}
          </Text>
        </View>
        
        <MaterialIcons name="chevron-right" size={24} color="#ccc" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    if (!query.trim()) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="search" size={64} color="#ccc" />
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ค้นหาผู้ใช้</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="พิมพ์ชื่อหรือนามสกุล..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {isLoading && (
          <ActivityIndicator 
            size="small" 
            color="#007AFF" 
            style={styles.loadingIcon} 
          />
        )}
      </View>

      <FlatList
        data={results}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.listContainer}
      />

      {/* Profile Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelButton}>ปิด</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ข้อมูลผู้ใช้</Text>
            <View style={styles.placeholder} />
          </View>

          {selectedUser && selectedUser._id && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.profileSection}>
                <View style={styles.profileAvatarContainer}>
                  {selectedUser.avatar ? (
                    <Image 
                      source={{ uri: `${API_URL}/${selectedUser.avatar.replace(/\\/g, '/').replace(/^\/+/, '')}` }} 
                      style={styles.profileAvatar} 
                      defaultSource={require('../../assets/default-avatar.png')}
                      onError={(error) => console.log('Profile avatar load error:', error)}
                    />
                  ) : (
                    <View style={styles.profileDefaultAvatar}>
                      <Text style={styles.profileAvatarText}>
                        {selectedUser.firstName ? selectedUser.firstName.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
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
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>อีเมล</Text>
                  <Text style={styles.infoValue}>{selectedUser.email || 'ไม่ระบุ'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>คณะ</Text>
                  <Text style={styles.infoValue}>{selectedUser.faculty || 'ไม่ระบุ'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>สาขา</Text>
                  <Text style={styles.infoValue}>{selectedUser.major || 'ไม่ระบุ'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>รหัสกลุ่ม</Text>
                  <Text style={styles.infoValue}>{selectedUser.groupCode || 'ไม่ระบุ'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => createChatRoom(selectedUser)}
              >
                <MaterialIcons name="chat" size={20} color="#fff" />
                <Text style={styles.chatButtonText}>สร้างแชท</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#F5C842', // เปลี่ยนเป็นสีเหลือง
    borderBottomWidth: 0, // ลบเส้นขอบ
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6B800', // เปลี่ยนเป็นสีเหลืองเข้มกว่าพื้นหลัง
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4A500', // เปลี่ยนเป็นสีเหลืองเข้มกว่า
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginTop: 16,
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6B800', // เปลี่ยนเป็นสีเหลืองเข้มกว่าพื้นหลัง
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4A500', // เปลี่ยนเป็นสีเหลืองเข้มกว่า
  },
  avatarContainer: {
    marginRight: 12,
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
    backgroundColor: '#FFA500', // เปลี่ยนเป็นสีส้ม
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
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
    paddingTop: 50,
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
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
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SearchUserScreen;