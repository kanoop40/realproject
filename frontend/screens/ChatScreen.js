import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://10.0.2.2:5000';

const ChatScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
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

      if (response.data.role === 'admin') {
        navigation.replace('Admin');
        return;
      }

      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
      if (error.response?.status === 401) {
        navigation.replace('Login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSearch = () => {
    navigation.navigate('Search');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={navigateToSearch}
          style={styles.iconButton}
        >
          <Icon name="search" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>แชท</Text>

        <TouchableOpacity 
          onPress={navigateToProfile}
          style={styles.iconButton}
        >
          <Icon name="account-circle" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.emptyContainer}>
        <Icon name="chat-bubble-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>ยังไม่มีข้อความ</Text>
        <Text style={styles.subText}>
          ค้นหาเพื่อนเพื่อเริ่มแชท
        </Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={navigateToSearch}
        >
          <Icon name="search" size={20} color="#fff" style={styles.searchIcon} />
          <Text style={styles.searchButtonText}>ค้นหาเพื่อน</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 24
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10
  },
  searchIcon: {
    marginRight: 8
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default ChatScreen;