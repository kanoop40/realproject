import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_URL } from '../../service/api'; // ใช้ api instance แทน axios
import { UserCard, AddButton, LogoutButton, UserActionsModal } from '../../components_admin';
import SuccessTickAnimation from '../../components/SuccessTickAnimation';
import LoadingOverlay from '../../components/LoadingOverlay';

const AdminScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserActions, setShowUserActions] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

 const fetchUsers = async () => {
  try {
    setIsLoading(true);
    setError('');

    console.log('🔄 AdminScreen: Fetching users...');
    console.log('🌐 API URL:', API_URL);

    // ใช้ api instance ที่มี interceptor แล้ว (ไม่ต้อง config token เอง)
    const response = await api.get('/users');
    
    console.log('✅ Users fetched successfully:', response.data?.length || 0, 'users');
    
    // เพิ่มการตรวจสอบข้อมูล
    if (response.data) {
      setUsers(response.data);
    } else {
      setError('ไม่พบข้อมูลผู้ใช้');
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error.response?.data || error.message);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Request URL:', `${API_URL}/api/users`);
    
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized, clearing token and redirecting');
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      setError(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้\nURL: ${API_URL}\nตรวจสอบการเชื่อมต่อเครือข่าย`);
    } else {
      setError(error.response?.data?.message || `เกิดข้อผิดพลาด: ${error.message}`);
    }
  } finally {
    setIsLoading(false);
  }
};

  // เรียกใช้ fetchUsers เมื่อกลับมาที่หน้านี้
  useFocusEffect(
    React.useCallback(() => {
      fetchUsers();
    }, [])
  );

  const handleDeleteUser = async (userId, username) => {
    try {
      Alert.alert(
        'ลบผู้ใช้',
        `คุณแน่ใจหรือไม่ที่จะลบ ${username}?`,
        [
          {
            text: 'ยกเลิก',
            style: 'cancel'
          },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: async () => {
              try {
                // ใช้ api instance (มี interceptor ใส่ token อัตโนมัติ)
                await api.delete(`/users/${userId}`);
                fetchUsers();
                // แสดง SuccessTickAnimation แทน Alert.alert
                setShowSuccess(true);
              } catch (error) {
                console.error('Error deleting user:', error);
                Alert.alert('ผิดพลาด', 'ไม่สามารถลบผู้ใช้ได้');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('ผิดพลาด', 'ไม่สามารถดำเนินการได้');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

 const handleUserPress = (user) => {
    setSelectedUser(user);
    setShowUserActions(true);
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
  };

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>ผู้ใช้งาน</Text>
        {__DEV__ && (
          <Text style={styles.debugText}>
            API: {API_URL} | Users: {users.length}
          </Text>
        )}
      </View>
      <LogoutButton onPress={handleLogout} />
    </View>

    {error ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchUsers}
        >
          <Text style={styles.retryButtonText}>ลองใหม่อีกครั้ง</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: '#666', marginTop: 10 }]}
            onPress={() => {
              console.log('📊 Debug Info:');
              console.log('API_URL:', API_URL);
              console.log('Users count:', users.length);
              console.log('Error:', error);
            }}
          >
            <Text style={styles.retryButtonText}>Show Debug Info</Text>
          </TouchableOpacity>
        )}
      </View>
    ) : users.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ไม่พบข้อมูลผู้ใช้</Text>
      </View>
    ) : (
      <ScrollView style={styles.content}>
        {users.map((user) => (
          <UserCard 
            key={user._id} 
            user={user} 
            onPress={handleUserPress}
            onDelete={handleDeleteUser}
          />
        ))}
      </ScrollView>
    )}

    <View style={styles.actionButtonsContainer}>
      <AddButton onPress={() => navigation.navigate('AddUser')} />
      
      <TouchableOpacity 
        style={styles.manageDataButton}
        onPress={() => navigation.navigate('ManageData')}
      >
        <Text style={styles.manageDataButtonText}>🔧 จัดการข้อมูลระบบ</Text>
      </TouchableOpacity>
    </View>

    <UserActionsModal
      visible={showUserActions}
      selectedUser={selectedUser}
      onClose={() => setShowUserActions(false)}
      onEdit={(user) => navigation.navigate('UserDetail', { userId: user._id })}
      onDelete={(user) => handleDeleteUser(user._id, user.username)}
    />

    {/* Success Animation */}
    <SuccessTickAnimation
      visible={showSuccess}
      onComplete={handleSuccessComplete}
    />

    {/* Loading Overlay */}
    <LoadingOverlay
      visible={isLoading}
      message="กำลังโหลดข้อมูลผู้ใช้..."
    />
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50, // เพิ่มบรรทัดนี้ หรือปรับเลขตามความเหมาะสม
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },

  content: {
    flex: 1,
    backgroundColor: '#fff'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center'
  },


  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10
  },
  manageDataButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  manageDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  actionIcon: {
    fontSize: 18,
    color: '#fff'
  },


});

export default AdminScreen;