import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:5000';

const AdminScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ดึงข้อมูลผู้ใช้ทั้งหมด
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');

      // ดึง token จาก AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      // เพิ่ม token ใน headers
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.get(`${API_URL}/api/users`, config);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error);
      if (error.response?.status === 401) {
        // ถ้า token ไม่ถูกต้องหรือหมดอายุ ให้กลับไปหน้า login
        await AsyncStorage.removeItem('userToken');
        navigation.replace('Login');
      } else {
        setError(error.response?.data?.message || 'Failed to load users');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ลบผู้ใช้
  const handleDeleteUser = async (userId, username) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      Alert.alert(
        'Delete User',
        `Are you sure you want to delete ${username}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await axios.delete(`${API_URL}/api/users/${userId}`, config);
                fetchUsers(); // โหลดข้อมูลใหม่
                Alert.alert('Success', 'User deleted successfully');
              } catch (error) {
                console.error('Error deleting user:', error.response?.data || error);
                Alert.alert('Error', error.response?.data?.message || 'Failed to delete user');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to process request');
    }
  };

  // ออกจากระบบ
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // แสดงข้อมูลพื้นฐานของผู้ใช้
  const renderUserInfo = (user) => (
    <View style={styles.userInfo}>
      <Text style={styles.username}>{user.username}</Text>
      <Text style={styles.userDetail}>{user.firstName} {user.lastName}</Text>
      <Text style={styles.userDetail}>{user.email}</Text>
      {user.faculty && <Text style={styles.userDetail}>คณะ: {user.faculty}</Text>}
      {user.major && <Text style={styles.userDetail}>สาขา: {user.major}</Text>}
      {user.groupCode && <Text style={styles.userDetail}>กลุ่ม: {user.groupCode}</Text>}
      <View style={styles.roleContainer}>
        <Text style={[styles.roleText, styles[`role_${user.role}`]]}>
          {user.role}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ผู้ใช้งาน</Text>
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
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {users.map((user) => (
            <View key={user._id} style={styles.userCard}>
              {renderUserInfo(user)}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => navigation.navigate('EditUser', { userId: user._id })}
                >
                  <Icon name="edit" size={20} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteUser(user._id, user.username)}
                >
                  <Icon name="delete" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AddUser')}
      >
        <Icon name="add" size={24} color="#fff" />
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
    padding: 15
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
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  userInfo: {
    flex: 1
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  roleContainer: {
    marginTop: 5
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start'
  },
  role_admin: {
    backgroundColor: '#007AFF',
    color: '#fff'
  },
  role_teacher: {
    backgroundColor: '#34C759',
    color: '#fff'
  },
  role_student: {
    backgroundColor: '#FF9500',
    color: '#fff'
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 10
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  }
});
// styles ยังคงเหมือนเดิม

export default AdminScreen;
