import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:5000';

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setUserData(response.data);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'ไม่สามารถออกจากระบบได้');
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { userData });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // แปลง role เป็นภาษาไทย
  const translateRole = (role) => {
    switch (role) {
      case 'student': return 'นักศึกษา';
      case 'teacher': return 'อาจารย์';
      case 'admin': return 'ผู้ดูแลระบบ';
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
        <Text style={styles.headerTitle}>โปรไฟล์</Text>
        <TouchableOpacity 
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userData?.profileImage ? (
              <Image 
                source={{ uri: `${API_URL}/${userData.profileImage}` }}
                style={styles.avatar}
                defaultSource={require('../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.avatar, styles.emptyAvatar]}>
                <Text style={styles.avatarText}>
                  {userData?.firstName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {userData?.firstName} {userData?.lastName}
          </Text>
          <Text style={styles.role}>{translateRole(userData?.role)}</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Icon name="edit" size={16} color="#fff" style={styles.editIcon} />
            <Text style={styles.editButtonText}>แก้ไขโปรไฟล์</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ชื่อผู้ใช้</Text>
            <Text style={styles.infoValue}>{userData?.username}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>อีเมล</Text>
            <Text style={styles.infoValue}>{userData?.email}</Text>
          </View>

          {userData?.role === 'student' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>คณะ</Text>
                <Text style={styles.infoValue}>{userData?.faculty}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>สาขา</Text>
                <Text style={styles.infoValue}>{userData?.major}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>กลุ่มเรียน</Text>
                <Text style={styles.infoValue}>{userData?.groupCode}</Text>
              </View>
            </>
          )}

          {userData?.role === 'teacher' && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>คณะ</Text>
                <Text style={styles.infoValue}>{userData?.faculty}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>สาขา</Text>
                <Text style={styles.infoValue}>{userData?.major}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 30,
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
    color: '#333'
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  emptyAvatar: {
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#666'
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  editIcon: {
    marginRight: 8
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#fff'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  infoLabel: {
    fontSize: 16,
    color: '#666'
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  }
});

export default ProfileScreen;