import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../api/api';
import * as ImagePicker from 'expo-image-picker';

const EDITABLE_COLOR = '#A29889';
const NONEDITABLE_COLOR = '#fff';

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/user/profile');
        setProfile(res.data);
      } catch (e) {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      const sendData = {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
      };
      await api.put('/user/profile', sendData);
      setEditMode(false);
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const handlePickImage = async () => {
  if (!editMode) return;

  // ขอ permission ก่อน (Expo จะจัดการอัตโนมัติ แต่ควรเช็ค)
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('ต้องอนุญาติเข้าถึงรูปภาพในเครื่อง');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (result.canceled) return;
  if (result.assets && result.assets.length > 0) {
    const image = result.assets[0];
    // สำหรับการอัปโหลดผ่าน API อาจต้องแปลงเป็น FormData แบบเดิม
    const data = new FormData();
    data.append('avatar', {
      uri: image.uri,
      name: image.fileName || 'avatar.jpg',
      type: 'image/jpeg', // Expo ไม่คืน type ต้อง fix ไว้
    });
    try {
      const res = await api.post('/user/upload-avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, avatar: res.data.avatar }));
    } catch (e) {
      Alert.alert('อัปโหลดรูปไม่สำเร็จ', e?.response?.data?.error || e.message);
    }
  }
};


  const getRoleDisplay = (role) => {
    if (!role) return 'Role';
    if (role === 'teacher') return 'อาจารย์';
    if (role === 'student') return 'นักศึกษา';
    if (role === 'staff') return 'เจ้าหน้าที่';
    if (role === 'admin') return 'ผู้ดูแลระบบ';
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
    <View style={styles.container}>
      {/* Top left back arrow */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>{"<"}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollBox} keyboardShouldPersistTaps="handled">
        {/* Role */}
        <Text style={styles.roleText}>{getRoleDisplay(profile.role)}</Text>

        {/* Avatar */}
        <TouchableOpacity
          onPress={editMode ? handlePickImage : undefined}
          style={[
            styles.avatarBox,
            editMode && { backgroundColor: EDITABLE_COLOR }
          ]}
          disabled={!editMode}
          activeOpacity={editMode ? 0.7 : 1}
        >
          <Image
            source={profile.avatar ? { uri: profile.avatar } : require('../assets/avatar-default.jpg')}
            style={[styles.avatar, editMode && { opacity: 0.55 }]}
          />
          {editMode && (
            <View style={styles.avatarOverlay}>
              <Text style={styles.avatarOverlayText}>เปลี่ยนรูป</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Student/Staff ID */}
        <Text style={styles.idLabel}>รหัสนักศึกษา</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={profile.username}
            editable={false}
            style={[styles.input, styles.inputFull, styles.inputCenter, styles.inputBold, { backgroundColor: NONEDITABLE_COLOR }]}
          />
        </View>

        {/* Name & Surname */}
        <View style={styles.row}>
          <TextInput
            value={profile.firstName}
            editable={editMode}
            placeholder="ชื่อ"
            onChangeText={text => setProfile({ ...profile, firstName: text })}
            style={[
              styles.input,
              styles.inputHalf,
              styles.inputCenter,
              { backgroundColor: editMode ? EDITABLE_COLOR : NONEDITABLE_COLOR }
            ]}
            placeholderTextColor="#fff"
          />
          <TextInput
            value={profile.lastName}
            editable={editMode}
            placeholder="นามสกุล"
            onChangeText={text => setProfile({ ...profile, lastName: text })}
            style={[
              styles.input,
              styles.inputHalf,
              styles.inputCenter,
              { marginLeft: 14, backgroundColor: editMode ? EDITABLE_COLOR : NONEDITABLE_COLOR }
            ]}
            placeholderTextColor="#fff"
          />
        </View>

        {/* Room/Group */}
        <View style={styles.inputWrap}>
          <TextInput
            value={profile.groupCode}
            editable={false}
            placeholder="ห้อง"
            style={[styles.input, styles.inputFull, styles.inputCenter, { backgroundColor: NONEDITABLE_COLOR }]}
          />
        </View>

        {/* Gmail */}
        <View style={styles.inputWrap}>
          <TextInput
            value={profile.email}
            editable={editMode}
            placeholder="Gmail"
            onChangeText={text => setProfile({ ...profile, email: text })}
            style={[
              styles.input,
              styles.inputFull,
              styles.inputCenter,
              { backgroundColor: editMode ? EDITABLE_COLOR : NONEDITABLE_COLOR }
            ]}
            placeholderTextColor="#fff"
          />
        </View>

        {/* Major */}
        <View style={styles.inputWrap}>
          <TextInput
            value={profile.major}
            editable={false}
            placeholder="สาขาวิชา"
            style={[styles.input, styles.inputFull, styles.inputCenter, { backgroundColor: NONEDITABLE_COLOR }]}
          />
        </View>

        {/* Edit/Save button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={editMode ? handleSave : () => setEditMode(true)}
        >
          <Text style={styles.editBtnText}>{editMode ? "บันทึก" : "แก้ไข"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC43D',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollBox: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 12,
    width: '100%',
    minHeight: '100%',
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 34,
    left: 16,
    zIndex: 2,
    backgroundColor: '#FFD561',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    // shadow for iOS
    shadowColor: '#bbb',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  backArrow: {
    fontSize: 26,
    color: '#333',
    fontWeight: 'bold',
    marginTop: -1,
  },
  roleText: {
    fontSize: 18,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  avatarBox: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#fff',
    marginBottom: 13,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#bbb',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  avatar: {
    width: 178,
    height: 178,
    borderRadius: 89,
    backgroundColor: '#fff',
  },
  avatarOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    backgroundColor: '#0008',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    overflow: 'hidden',
  },
  idLabel: {
    fontWeight: 'bold',
    color: '#111',
    fontSize: 15,
    marginBottom: 5,
    textAlign: 'center',
    marginTop: 6,
  },
  inputWrap: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 16,
    color: '#222',
    elevation: 2,
    shadowColor: '#bbb',
    shadowOpacity: 0.09,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  inputFull: {
    width: 240,
    alignSelf: 'center',
  },
  inputHalf: {
    width: 115,
  },
  inputCenter: {
    textAlign: 'center',
  },
  inputBold: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: 240,
    marginBottom: 12,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderRadius: 999,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 48,
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#bbb',
    shadowOpacity: 0.11,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 10,
  },
  editBtnText: {
    color: '#222',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFC43D' },
});

export default ProfileScreen;