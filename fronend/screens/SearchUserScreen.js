import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../api/api';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    faculty: "",
    major: "",
    groupCode: "",
    avatar: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ดึงข้อมูลโปรไฟล์จาก backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/user/profile');
        // ตรวจสอบ response
        if (res.data && res.data.username) {
          setProfile(res.data);
        } else {
          throw new Error('Invalid profile data');
        }
      } catch (e) {
  console.log('PROFILE FETCH ERROR:', e?.response?.data || e.message || e);
  Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์");
} finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/user/profile', profile);
      // ตรวจสอบ response
      if (res.data && res.data.username) {
        setProfile(res.data);
        setEditMode(false);
        Alert.alert("สำเร็จ", "บันทึกโปรไฟล์แล้ว");
      } else {
        throw new Error('Invalid save response');
      }
    } catch (e) {
      console.log('PROFILE SAVE ERROR:', e?.response?.data || e.message || e);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.profileBox}>
        <View style={styles.avatarBox}>
          <Image
            source={profile.avatar ? { uri: profile.avatar } : require('../assets/avatar-default.jpg')}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.label}>รหัสนักศึกษา/พนักงาน</Text>
        <TextInput
          value={profile.username}
          editable={false}
          style={[styles.input, { backgroundColor: "#ececec" }]}
        />
        <Text style={styles.label}>อีเมล</Text>
        <TextInput
          value={profile.email}
          onChangeText={text => setProfile({ ...profile, email: text })}
          editable={editMode}
          style={styles.input}
        />
        <Text style={styles.label}>ชื่อ</Text>
        <TextInput
          value={profile.firstName}
          onChangeText={text => setProfile({ ...profile, firstName: text })}
          editable={editMode}
          style={styles.input}
        />
        <Text style={styles.label}>นามสกุล</Text>
        <TextInput
          value={profile.lastName}
          onChangeText={text => setProfile({ ...profile, lastName: text })}
          editable={editMode}
          style={styles.input}
        />
        <Text style={styles.label}>คณะ</Text>
        <TextInput
          value={profile.faculty}
          onChangeText={text => setProfile({ ...profile, faculty: text })}
          editable={editMode}
          style={styles.input}
        />
        <Text style={styles.label}>สาขา</Text>
        <TextInput
          value={profile.major}
          onChangeText={text => setProfile({ ...profile, major: text })}
          editable={editMode}
          style={styles.input}
        />
        <Text style={styles.label}>รหัสกลุ่มเรียน</Text>
        <TextInput
          value={profile.groupCode}
          onChangeText={text => setProfile({ ...profile, groupCode: text })}
          editable={editMode}
          style={styles.input}
        />

        <View style={styles.buttonRow}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.buttonText}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditMode(false)}
                disabled={saving}
              >
                <Text style={styles.buttonText}>ยกเลิก</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.buttonText}>แก้ไขโปรไฟล์</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd' },
  profileBox: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    elevation: 6,
    shadowColor: '#2196f3',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  avatarBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 95,
    height: 95,
    borderRadius: 55,
    backgroundColor: '#cfd8dc',
    marginBottom: 6,
  },
  label: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 15,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#90caf9',
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  editButton: {
    backgroundColor: '#1976d2',
  },
  saveButton: {
    backgroundColor: '#43a047',
  },
  cancelButton: {
    backgroundColor: '#d32f2f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;