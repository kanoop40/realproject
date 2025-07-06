import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const ChatScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadChats();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('http://10.0.2.2:5000/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadChats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('http://10.0.2.2:5000/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Search')}
          style={styles.searchButton}
        >
          <Icon name="search" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          {currentUser?.profileImage ? (
            <Image 
              source={{ uri: currentUser.profileImage }} 
              style={styles.profileImage}
            />
          ) : (
            <Icon name="account-circle" size={24} color="#333" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => navigation.navigate('ChatDetail', { chatId: item._id })}
          >
            <Image 
              source={{ uri: item.participant.profileImage || 'default_image_url' }}
              style={styles.avatar}
            />
            <View style={styles.chatInfo}>
              <Text style={styles.username}>{item.participant.username}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  searchButton: {
    padding: 5
  },
  profileButton: {
    padding: 5
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15
  },
  chatInfo: {
    flex: 1
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 5
  }
});

export default ChatScreen;