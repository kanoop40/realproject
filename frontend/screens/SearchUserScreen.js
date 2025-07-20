import React, { useState } from 'react';
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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_URL = 'http://10.0.2.2:5000';

const SearchUserScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อความที่ต้องการค้นหา');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      console.log('Searching with query:', query);
      
      const response = await axios.get(`${API_URL}/api/users/search`, {
        params: { q: query },
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Search response:', response.data);

      if (Array.isArray(response.data)) {
        setResults(response.data);
        if (response.data.length === 0) {
          setError('ไม่พบผู้ใช้ที่ค้นหา');
        }
      } else {
        console.warn('Invalid response format:', response.data);
        setError('ข้อมูลไม่ถูกต้อง');
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        navigation.replace('Login');
      } else {
        setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการค้นหา');
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserPress = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleStartChat = () => {
    setShowModal(false);
    // นำทางไปหน้าแชทพร้อมข้อมูลผู้ใช้
    navigation.navigate('Chat', { 
      recipientId: selectedUser._id,
      recipientName: `${selectedUser.firstName} ${selectedUser.lastName}`,
      recipientAvatar: selectedUser.avatar 
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image
            source={{ uri: `${API_URL}/${item.avatar}` }}
            style={styles.avatar}
            defaultSource={require('../assets/default-avatar.png')}
          />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {item.firstName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.roleText}>{translateRole(item.role)}</Text>
        {item.faculty && (
          <Text style={styles.facultyText}>
            {item.faculty} {item.major ? `• ${item.major}` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const translateRole = (role) => {
    switch (role) {
      case 'student': return 'นักศึกษา';
      case 'teacher': return 'อาจารย์';
      default: return role;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ค้นหาผู้ใช้</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="ค้นหาด้วยชื่อ"
            placeholderTextColor="#999"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity 
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>กำลังค้นหา...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="search-off" size={48} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            query.length > 0 ? (
              <View style={styles.centerContainer}>
                <Icon name="search-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>ไม่พบผู้ใช้ที่ค้นหา</Text>
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Icon name="search" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  กรุณากรอกข้อความเพื่อค้นหาผู้ใช้
                </Text>
              </View>
            )
          }
        />
      )}

      {/* User Profile Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ข้อมูลผู้ใช้</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalContent}>
                <View style={styles.modalProfileSection}>
                  <View style={styles.modalAvatarContainer}>
                    {selectedUser.avatar ? (
                      <Image
                        source={{ uri: `${API_URL}/${selectedUser.avatar}` }}
                        style={styles.modalAvatar}
                        defaultSource={require('../assets/default-avatar.png')}
                      />
                    ) : (
                      <View style={[styles.modalAvatar, styles.modalDefaultAvatar]}>
                        <Text style={styles.modalAvatarText}>
                          {selectedUser.firstName?.[0]?.toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalUserInfo}>
                    <Text style={styles.modalUserName}>
                      {selectedUser.firstName} {selectedUser.lastName}
                    </Text>
                    <Text style={styles.modalUsername}>@{selectedUser.username}</Text>
                    <View style={styles.modalRoleContainer}>
                      <Icon name="verified-user" size={16} color="#007AFF" />
                      <Text style={styles.modalRoleText}>{translateRole(selectedUser.role)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalDetailsSection}>
                  <View style={styles.modalDetailItem}>
                    <Icon name="email" size={18} color="#666" />
                    <Text style={styles.modalDetailLabel}>อีเมล</Text>
                    <Text style={styles.modalDetailValue}>{selectedUser.email}</Text>
                  </View>

                  {selectedUser.faculty && (
                    <View style={styles.modalDetailItem}>
                      <Icon name="school" size={18} color="#666" />
                      <Text style={styles.modalDetailLabel}>คณะ</Text>
                      <Text style={styles.modalDetailValue}>{selectedUser.faculty}</Text>
                    </View>
                  )}

                  {selectedUser.major && (
                    <View style={styles.modalDetailItem}>
                      <Icon name="library-books" size={18} color="#666" />
                      <Text style={styles.modalDetailLabel}>สาขา</Text>
                      <Text style={styles.modalDetailValue}>{selectedUser.major}</Text>
                    </View>
                  )}

                  {selectedUser.groupCode && selectedUser.role !== 'teacher' && (
                    <View style={styles.modalDetailItem}>
                      <Icon name="group" size={18} color="#666" />
                      <Text style={styles.modalDetailLabel}>รหัสกลุ่ม</Text>
                      <Text style={styles.modalDetailValue}>{selectedUser.groupCode}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActionSection}>
                  <TouchableOpacity 
                    style={styles.modalChatButton}
                    onPress={handleStartChat}
                  >
                    <Icon name="chat" size={20} color="#fff" />
                    <Text style={styles.modalChatButtonText}>เริ่มแชท</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333'
  },
  searchSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333'
  },
  clearButton: {
    padding: 4
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 8,
    color: '#666'
  },
  listContainer: {
    flexGrow: 1
  },
  userCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff'
  },
  avatarContainer: {
    marginRight: 16
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  defaultAvatar: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666'
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  roleText: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 2
  },
  facultyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 8
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    height: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  modalContent: {
    flex: 1,
    justifyContent: 'space-between'
  },
  modalProfileSection: {
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalAvatarContainer: {
    marginBottom: 12
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  modalDefaultAvatar: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666'
  },
  modalUserInfo: {
    alignItems: 'center'
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  modalUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  modalRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15
  },
  modalRoleText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500'
  },
  modalDetailsSection: {
    flex: 1,
    paddingVertical: 20
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  modalActionSection: {
    padding: 30,
    paddingBottom: 40
  },
  modalChatButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  modalChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6
  }
});

export default SearchUserScreen;