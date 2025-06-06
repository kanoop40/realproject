import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import socket from '../api/socket';

const mockChats = [
  { id: '1', username: 'user123', name: 'Natthapat', lastMessage: 'ข้อความที่ส่งมา', time: '12:30' },
  { id: '2', username: 'user456', name: 'Narera', lastMessage: 'ข้อความที่ส่งมา', time: '11:08' },
  { id: '3', username: 'user789', name: 'Natha', lastMessage: 'ข้อความที่ส่งมา', time: '10:20' },
  { id: '4', username: 'user012', name: 'วิชาภาษาไทย (24)', lastMessage: 'ข้อความที่ส่งมา', time: '09:50' },
  { id: '5', username: 'user333', name: 'marena', lastMessage: 'ข้อความที่ส่งมา', time: '08:30' },
];

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const SIDE_PADDING = 16;
const HEADER_TOP_SPACING = Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 38;
const ICON_SIZE = 34;
const AVATAR_ICON_SIZE = 36;

const ChatScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    setChats(mockChats);
    socket.on('chatListUpdate', (chatList) => setChats(chatList));
    return () => socket.off('chatListUpdate');
  }, []);

  const filteredChats = chats.filter(
    chat =>
      chat.name.toLowerCase().includes(search.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleDelete = (id) => {
    setChats(prev => prev.filter(chat => chat.id !== id));
  };

  const renderItem = ({ item }) => (
    <View style={styles.chatItem}>
      <TouchableOpacity
        style={styles.avatarBox}
        onPress={() => navigation.navigate('ChatRoom', { user: item })}
        activeOpacity={0.8}
      >
        <View style={styles.avatar}>
          <Icon name="person" color="#d9ad33" size={AVATAR_ICON_SIZE} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1, justifyContent: 'center' }}
        onPress={() => navigation.navigate('ChatRoom', { user: item })}
        activeOpacity={0.8}
      >
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteBtnText}>ลบ</Text>
      </TouchableOpacity>
    </View>
  );

  // Popup Menu
  const PopupMenu = () => (
    <Modal
      transparent
      visible={menuVisible}
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
        <View style={styles.popupMenuBox}>
          <TouchableOpacity
            style={styles.popupMenuItem}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('CreateGroup');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.popupMenuText}>สร้างกลุ่ม</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.popupMenuItem}
            onPress={() => {
              setMenuVisible(false);
              navigation.replace('Login');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.popupMenuText, { color: '#e53935' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Search icon now links to SearchUser */}
        <TouchableOpacity
          style={styles.iconTouch}
          onPress={() => navigation.navigate('SearchUser')}
          activeOpacity={0.7}
        >
          <Icon name="search" size={ICON_SIZE} color="#d9ad33" style={{ marginHorizontal: 2 }} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.input}
            placeholder="ค้นหา"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#b6a47c"
          />
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person" size={ICON_SIZE} color="#d9ad33" />
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 40 }}>ยังไม่มีแชท</Text>
          }
          contentContainerStyle={filteredChats.length === 0 ? { flex: 1 } : undefined}
        />
      </View>

      <PopupMenu />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.85}
      >
        <Icon name="add" size={38} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffda7b',
    paddingHorizontal: SIDE_PADDING,
    paddingTop: HEADER_TOP_SPACING,
    paddingBottom: 8,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ffecb2',
    elevation: 3,
    shadowColor: '#e8c77b',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 20,
  },
  iconTouch: {
    padding: 6,
    marginRight: 8,
    borderRadius: 24,
    backgroundColor: '#fff7df',
    elevation: 2,
  },
  searchBar: {
    flex: 1.04,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7df',
    borderRadius: 10,
    marginRight: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#ffe0a6',
    elevation: 2,
    shadowColor: '#e8c77b',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  input: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 18,
    color: '#b6922e',
    backgroundColor: 'transparent',
    fontWeight: '500',
  },
  profileBtn: {
    backgroundColor: '#ffda7b',
    borderRadius: 22,
    padding: 7,
    marginLeft: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#e8c77b',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  listSection: {
    backgroundColor: '#ffecb2',
    flex: 1,
    paddingBottom: 0,
    minHeight: screenHeight * 0.6,
    borderTopWidth: 0,
    paddingHorizontal: SIDE_PADDING,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderColor: '#ffe7a6',
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 4,
  },
  avatarBox: {
    marginRight: 15,
    marginLeft: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f7d26d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#f7d26d',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d1e0e',
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8c7a4a',
    marginBottom: 1,
    marginTop: 2,
    letterSpacing: 0.02,
  },
  deleteBtn: {
    backgroundColor: '#e53935',
    borderRadius: 17,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginLeft: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#d32f2f',
    shadowOpacity: 0.09,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.12,
  },
  fab: {
    position: 'absolute',
    right: SIDE_PADDING,
    bottom: 35,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffc43d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#e8c77b',
    shadowOpacity: 0.19,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 100,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupMenuBox: {
    backgroundColor: '#ffecb2',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  popupMenuItem: {
    backgroundColor: '#fff7df',
    borderRadius: 23,
    paddingVertical: 14,
    paddingHorizontal: 42,
    marginVertical: 8,
    alignItems: 'center',
    width: 170,
    elevation: 2,
  },
  popupMenuText: {
    color: '#ad8b34',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.17,
  },
});

export default ChatScreen;