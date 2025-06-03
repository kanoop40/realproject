import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../api/api';
import { launchImageLibrary } from 'react-native-image-picker';

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
    role: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/user/profile');
        setProfile(res.data);
      } catch (e) {
        console.log('Profile fetch error:', e?.response?.data || e.message || e);
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (result.didCancel) return;
    if (result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      const data = new FormData();
      data.append('avatar', {
        uri: image.uri,
        name: image.fileName || 'avatar.jpg',
        type: image.type || 'image/jpeg',
      });
      try {
        const res = await api.post('/user/upload-avatar', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setProfile(prev => ({ ...prev, avatar: res.data.avatar }));
        Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์แล้ว');
      } catch (e) {
        Alert.alert('อัปโหลดรูปไม่สำเร็จ', e?.response?.data?.error || e.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // ส่งเฉพาะ field ที่อนุญาตให้แก้ไข
      const sendData = {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
      };
      const res = await api.put('/user/profile', sendData);
      setProfile({ ...profile, ...res.data });
      setEditMode(false);
      Alert.alert("สำเร็จ", "บันทึกโปรไฟล์แล้ว");
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  // ฟังก์ชันแปลง role เป็นข้อความสถานะ
  const getRoleDisplay = (role) => {
    if (!role) return 'ยังไม่ได้ระบุสถานะ';
    if (role === 'teacher') return 'อาจารย์';
    if (role === 'student') return 'นักศึกษา';
    return role;
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
        <TouchableOpacity
          onPress={editMode ? handlePickImage : undefined}
          style={styles.avatarBox}
          disabled={!editMode}
        >
          <Image
            source={profile.avatar ? { uri: profile.avatar } : require('../assets/avatar-default.jpg')}
            style={styles.avatar}
          />
          {editMode && <Text style={styles.changeAvatar}>เปลี่ยนรูป</Text>}
        </TouchableOpacity>
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
        <Text style={styles.label}>สถานะ</Text>
        <TextInput
          value={getRoleDisplay(profile.role)}
          editable={false}
          style={[styles.input, { backgroundColor: "#ececec" }]}
        />
        {/* ไม่อนุญาตให้แก้ไขข้อมูลด้านล่าง */}
        <Text style={styles.label}>คณะ</Text>
        <TextInput
          value={profile.faculty}
          editable={false}
          style={[styles.input, { backgroundColor: "#ececec" }]}
        />
        <Text style={styles.label}>สาขา</Text>
        <TextInput
          value={profile.major}
          editable={false}
          style={[styles.input, { backgroundColor: "#ececec" }]}
        />
        <Text style={styles.label}>รหัสกลุ่มเรียน</Text>
        <TextInput
          value={profile.groupCode}
          editable={false}
          style={[styles.input, { backgroundColor: "#ececec" }]}
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
  changeAvatar: {
    color: '#1976d2',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
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