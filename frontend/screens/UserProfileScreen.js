import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:5000';

const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const translateRole = (role) => {
    switch (role) {
      case 'student': return 'นักศึกษา';
      case 'teacher': return 'อาจารย์';
      default: return role;
    }
  };

  if (isLoading) return <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 32}} />;

  if (!user) return (
    <View style={styles.container}>
      <Text style={styles.errorText}>ไม่พบข้อมูลผู้ใช้</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>โปรไฟล์ผู้ใช้</Text>
      </View>
      <View style={styles.profileHeader}>
        {user.profileImage ?
          <Image source={{ uri: `${API_URL}/${user.profileImage}` }} style={styles.avatar} />
          : <Icon name="account-circle" size={80} color="#ccc" />
        }
        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.role}>{translateRole(user.role)}</Text>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff'
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  profileHeader: { alignItems: 'center', padding: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  role: { fontSize: 14, color: '#007AFF', marginBottom: 6 },
  username: { fontSize: 14, color: '#555', marginBottom: 6 },
  email: { fontSize: 14, color: '#555' },
  errorText: { color: '#ff3b30', textAlign: 'center', marginTop: 32 }
});

export default UserProfileScreen;