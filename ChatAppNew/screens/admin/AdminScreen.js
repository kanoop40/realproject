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
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_URL } from '../../service/api'; // ใช้ api instance แทน axios

const AdminScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
                Alert.alert('สำเร็จ', 'ลบผู้ใช้เรียบร้อยแล้ว');
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

 const renderUserInfo = (user) => (
  <View style={styles.userInfo}>
    <View style={styles.leftContent}>
      <View style={styles.avatarContainer}>
        {user.avatar ? (
          <Image 
            source={{ uri: `${API_URL}/${user.avatar.replace(/\\/g, '/')}` }}
            style={styles.avatar}
            defaultSource={require('../../assets/default-avatar.png')}
            onError={(error) => {
              console.log('❌ Avatar load error in AdminScreen:', error.nativeEvent);
              console.log('❌ Avatar URL:', `${API_URL}/${user.avatar.replace(/\\/g, '/')}`);
            }}
            onLoad={() => {
              console.log('✅ Avatar loaded successfully in AdminScreen:', user.avatar);
            }}
          />
        ) : (
          <View style={[styles.avatar, styles.emptyAvatar]}>
            <Text style={styles.avatarText}>
              {user.firstName && user.firstName[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userTextContainer}>
        <Text style={styles.userName}>{user.firstName}</Text>
        <Text style={styles.roleText}>
          {user.role === 'student' ? 'นักศึกษา' : 
           user.role === 'admin' ? 'ผู้ดูแลระบบ' : 
           user.role === 'teacher' ? 'อาจารย์' : 
           user.role === 'staff' ? 'เจ้าหน้าที่' : user.role}
        </Text>
      </View>
    </View>
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={[styles.actionButton, styles.editButton]}
        onPress={() => navigation.navigate('UserDetail', { userId: user._id })}
      >
        <Text style={styles.actionIcon}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDeleteUser(user._id, user.username)}
      >
        <Text style={styles.actionIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  </View>
);

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
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>

    {isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    ) : error ? (
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
          <View key={user._id} style={styles.userCard}>
            {renderUserInfo(user)}
          </View>
        ))}
      </ScrollView>
    )}

    <TouchableOpacity 
      style={styles.fab}
      onPress={() => navigation.navigate('AddUser')}
    >
      <Text style={styles.fabIcon}>+</Text>
    </TouchableOpacity>
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
  logoutButton: {
    padding: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 6
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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
  userCard: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#E1E1E1'
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20
  },
  emptyAvatar: {
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666'
  },
  userTextContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  userName: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2
  },
  roleText: {
    fontSize: 14,
    color: '#666'
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 10
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  editButton: {
    backgroundColor: '#34C759'
  },
  deleteButton: {
    backgroundColor: '#ff3b30'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
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
  actionIcon: {
    fontSize: 18,
    color: '#fff'
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default AdminScreen;