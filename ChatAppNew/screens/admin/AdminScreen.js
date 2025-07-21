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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.2.38:5000';

const AdminScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

 const fetchUsers = async () => {
  try {
    setIsLoading(true);
    setError('');

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

    const response = await axios.get(`${API_URL}/api/users`, config);
    
    // เพิ่มการตรวจสอบข้อมูล
    if (response.data) {
      setUsers(response.data);
    } else {
      setError('ไม่พบข้อมูลผู้ใช้');
    }
  } catch (error) {
    console.error('Error fetching users:', error.response?.data || error);
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } else {
      setError(error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
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
                await axios.delete(`${API_URL}/api/users/${userId}`, config);
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
        {user.profileImage ? (
          <Image 
            source={{ uri: `${API_URL}/${user.profileImage}` }}
            style={styles.avatar}
            defaultSource={require('../../assets/default-avatar.png')}
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
           user.role === 'teacher' ? 'อาจารย์' : user.role}
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
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchUsers}
        >
          <Text style={styles.retryButtonText}>ลองใหม่อีกครั้ง</Text>
        </TouchableOpacity>
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
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 15
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