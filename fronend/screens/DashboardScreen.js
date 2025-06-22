import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import api from '../api/api'; // ใช้ API ของระบบสำหรับการดึงข้อมูล

const DashboardScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ดึงข้อมูลผู้ใช้ทั้งหมดจาก API
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users'); // Endpoint สำหรับดึงข้อมูลผู้ใช้
        setUsers(response.data); // สมมติว่า response.data เป็นรายการผู้ใช้
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <Image
        source={{ uri: item.avatar || 'https://via.placeholder.com/50' }} // รูปภาพของผู้ใช้ (ถ้ามี)
        style={styles.avatar}
      />
      <View>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userRole}>{item.role}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>ผู้ใช้งาน</Text>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <ActivityIndicator size="large" color="#ffc107" style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id.toString()} // ใช้ id ผู้ใช้เป็น key
          contentContainerStyle={styles.userList}
        />
      )}

      {/* Add User Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddUser')} // ไปยังหน้าสำหรับเพิ่มผู้ใช้ใหม่
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#ffc107',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ffc107',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DashboardScreen;