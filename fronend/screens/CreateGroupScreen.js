
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';

const CreateGroupScreen = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]);
  const [userInput, setUserInput] = useState('');

  const handleAddMember = () => {
    if (userInput.trim() && !members.includes(userInput.trim())) {
      setMembers([...members, userInput.trim()]);
      setUserInput('');
    }
  };

  const handleCreate = () => {
    if (!groupName || members.length < 2) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อกลุ่มและเพิ่มสมาชิกอย่างน้อย 2 คน");
      return;
    }
    // TODO: ส่งข้อมูลไป backend เพื่อสร้างกลุ่ม
    Alert.alert("สร้างกลุ่มสำเร็จ", `ชื่อกลุ่ม: ${groupName}`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>สร้างกลุ่มแชท</Text>
      <TextInput
        style={styles.input}
        placeholder="ชื่อกลุ่ม"
        value={groupName}
        onChangeText={setGroupName}
      />
      <Text style={styles.label}>เพิ่มสมาชิก</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="รหัสผู้ใช้ เช่น 651234567890"
          value={userInput}
          onChangeText={setUserInput}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddMember}>
          <Text style={{ color: '#fff' }}>เพิ่ม</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={members}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <Text style={styles.member}>{item}</Text>}
        ListEmptyComponent={<Text style={{ color: '#888' }}>ยังไม่มีสมาชิก</Text>}
        style={{ marginBottom: 16 }}
      />
      <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>สร้างกลุ่ม</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#e3f2fd' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1976d2', marginBottom: 18 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#90caf9', fontSize: 16 },
  label: { fontWeight: 'bold', color: '#1976d2', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  addBtn: { backgroundColor: '#1976d2', padding: 12, borderRadius: 8, marginLeft: 8 },
  member: { padding: 8, color: '#333', backgroundColor: '#e3f2fd', borderRadius: 6, marginVertical: 2 },
  createBtn: { backgroundColor: '#43a047', padding: 14, borderRadius: 10, alignItems: 'center' },
});

export default CreateGroupScreen;