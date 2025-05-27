import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // npm install react-native-vector-icons
import socket from '../api/socket';

const mockChats = [
  { id: '1', username: 'user123', name: 'สมชาย', lastMessage: 'สวัสดีครับ', time: '12:30' },
  { id: '2', username: 'user456', name: 'สมหญิง', lastMessage: 'เจอกันพรุ่งนี้', time: '10:15' },
];

const ChatScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    setChats(mockChats);

    socket.on('chatListUpdate', (chatList) => setChats(chatList));
    return () => socket.off('chatListUpdate');
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <Text style={styles.headerTitle}>แชท</Text>,
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('SearchUser')}>
          <Icon name="search" size={28} color="#1976d2" style={{ marginLeft: 16 }} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="person" size={28} color="#1976d2" style={{ marginRight: 16 }} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatRoom', { user: item })}
    >
      <Icon name="account-circle" size={42} color="#90caf9" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </TouchableOpacity>
  );

  // เมนูแฮมเบอร์เกอร์ด้านล่างขวา
  const FloatingMenu = () => (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name="menu" size={32} color="#fff" />
      </TouchableOpacity>
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('CreateGroup');
              }}
            >
              <Icon name="group-add" size={24} color="#1976d2" style={{ marginRight: 8 }} />
              <Text style={styles.menuText}>สร้างกลุ่ม</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // TODO: ใส่ลอจิก logout ที่นี่
                navigation.replace('Login');
              }}
            >
              <Icon name="logout" size={24} color="#d32f2f" style={{ marginRight: 8 }} />
              <Text style={[styles.menuText, { color: '#d32f2f' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 40 }}>ยังไม่มีแชท</Text>
        }
      />
      <FloatingMenu />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1976d2' },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderColor: '#e3f2fd',
    backgroundColor: '#fff',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#333' },
  lastMessage: { fontSize: 14, color: '#607d8b', marginTop: 2 },
  time: { color: '#90caf9', fontSize: 12, marginLeft: 8 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 32,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
  },
  menuBox: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 38,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  menuText: {
    fontSize: 17,
    color: '#1976d2',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e3f2fd',
    marginHorizontal: 8,
  },
});

export default ChatScreen;