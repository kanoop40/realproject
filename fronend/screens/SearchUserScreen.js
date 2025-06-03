import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import api from '../api/api';

const DEFAULT_AVATAR = require('../assets/avatar-default.jpg'); // ใส่ path รูป default ด้วย

const SearchUserScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await api.get('/user/suggest');
        setSuggested(res.data.users || []);
      } catch (err) {
        setSuggested([]);
      }
    };
    fetchSuggested();
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/user/search?query=${encodeURIComponent(search)}`);
      setUsers(res.data.users || []);
    } catch (err) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถค้นหาได้');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันแปลง role/stauts
  const getStatusText = (role) => {
    if (!role) return '';
    if (role === 'teacher' || role === 'อาจารย์') return 'อาจารย์';
    if (role === 'student' || role === 'นักศึกษา') return 'นักศึกษา';
    return role;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
    >
      <View style={styles.row}>
        <Image
          source={item.avatar ? { uri: item.avatar } : DEFAULT_AVATAR}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.status}>{getStatusText(item.role || item.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSuggested = () => (
    <View style={styles.suggestBox}>
      <Text style={styles.suggestHeader}>ผู้ใช้งานแนะนำ</Text>
      <FlatList
        data={suggested}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.noResult}>ไม่พบผู้ใช้งานแนะนำ</Text>}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="ค้นหาด้วยชื่อ, username หรืออีเมล"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      <TouchableOpacity style={styles.button} onPress={handleSearch}>
        <Text style={styles.buttonText}>ค้นหา</Text>
      </TouchableOpacity>
      {search.trim() === '' && renderSuggested()}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#1976d2" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          ListEmptyComponent={
            search.trim() !== '' && !loading
              ? <Text style={styles.noResult}>ไม่พบผู้ใช้</Text>
              : null
          }
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#e3f2fd' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#90caf9',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  item: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    marginRight: 10,
    elevation: 2,
    minWidth: 180,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#cfd8dc',
  },
  name: { fontWeight: 'bold', fontSize: 16, color: '#1976d2' },
  status: { fontSize: 15, marginTop: 2, color: '#43a047' },
  noResult: { color: '#888', alignSelf: 'center', marginTop: 36, fontSize: 16 },
  suggestBox: { marginTop: 28, marginBottom: 16 },
  suggestHeader: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
    marginLeft: 4,
  }
});

export default SearchUserScreen;