import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_URL = 'http://10.0.2.2:5000'; 

// ข้อมูลสำหรับ dropdown
const faculties = [
  { label: 'เลือกคณะ', value: '' },
  { label: 'วิศวกรรมศาสตร์', value: 'Engineering' },
  { label: 'วิทยาศาสตร์', value: 'Science' },
];

const majors = {
  Engineering: [
    { label: 'เลือกสาขา', value: '' },
    { label: 'วิศวกรรมคอมพิวเตอร์', value: 'Computer Engineering' },
    { label: 'วิศวกรรมไฟฟ้า', value: 'Electrical Engineering' },
  ],
  Science: [
    { label: 'เลือกสาขา', value: '' },
    { label: 'วิทยาการคอมพิวเตอร์', value: 'Computer Science' },
    { label: 'คณิตศาสตร์', value: 'Mathematics' },
  ],
};

const groupCodes = [
  { label: 'เลือกกลุ่มเรียน', value: '' },
  { label: 'CE01', value: 'CE01' },
  { label: 'CE02', value: 'CE02' },
  { label: 'CE03', value: 'CE03' },
];

const AddUserScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'student',
    faculty: '',
    major: '',
    groupCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

 const handleSubmit = async () => {
  if (!formData.username || !formData.password || !formData.firstName || 
      !formData.lastName || !formData.email || !formData.faculty || 
      !formData.major || !formData.groupCode) {
    Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
    return;
  }

  // ตรวจสอบรูปแบบอีเมล
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    setErrors(prev => ({...prev, email: 'รูปแบบอีเมลไม่ถูกต้อง'}));
    return;
  }

  try {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      navigation.replace('Login');
      return;
    }

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // เพิ่ม console.log เพื่อตรวจสอบ
    console.log('Sending data:', formData);

    const response = await axios.post(`${API_URL}/api/users`, formData, config);
    
    console.log('Response:', response.data);

    Alert.alert('สำเร็จ', 'เพิ่มผู้ใช้เรียบร้อยแล้ว', [
      {
        text: 'ตกลง',
        onPress: () => navigation.goBack()
      }
    ]);
  } catch (error) {
    console.error('Error adding user:', error.response || error);
    let errorMessage = 'ไม่สามารถเพิ่มผู้ใช้ได้';
    
    if (error.response) {
      switch (error.response.status) {
        case 400:
          errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก';
          break;
        case 401:
          errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
          navigation.replace('Login');
          break;
        case 403:
          errorMessage = 'คุณไม่มีสิทธิ์ในการเพิ่มผู้ใช้';
          break;
        case 409:
          errorMessage = 'มีผู้ใช้นี้ในระบบแล้ว';
          break;
        default:
          errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้';
      }
    }
    
    Alert.alert('ผิดพลาด', errorMessage);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เพิ่มผู้ใช้งาน</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อผู้ใช้</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({...formData, username: text})}
              placeholder="กรอกชื่อผู้ใช้"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              placeholder="กรอกรหัสผ่าน"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อ</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) => setFormData({...formData, firstName: text})}
              placeholder="กรอกชื่อ"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>นามสกุล</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) => setFormData({...formData, lastName: text})}
              placeholder="กรอกนามสกุล"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => {
                setFormData({...formData, email: text});
                setErrors(prev => ({...prev, email: ''}));
              }}
              placeholder="กรอกอีเมล"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>สถานะ</Text>
            <View style={styles.roleButtons}>
              {['student', 'teacher', 'admin'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    formData.role === role && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({...formData, role})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === role && styles.roleButtonTextActive
                  ]}>
                    {role === 'student' ? 'นักศึกษา' :
                     role === 'teacher' ? 'อาจารย์' : 'ผู้ดูแลระบบ'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>คณะ</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.faculty}
                onValueChange={(value) => {
                  setFormData({...formData, faculty: value, major: ''});
                }}
                style={styles.picker}
              >
                {faculties.map((faculty) => (
                  <Picker.Item 
                    key={faculty.value} 
                    label={faculty.label} 
                    value={faculty.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>สาขา</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.major}
                onValueChange={(value) => setFormData({...formData, major: value})}
                style={styles.picker}
                enabled={!!formData.faculty}
              >
                {(formData.faculty ? majors[formData.faculty] : [{ label: 'เลือกคณะก่อน', value: '' }])
                  .map((major) => (
                    <Picker.Item 
                      key={major.value} 
                      label={major.label} 
                      value={major.value}
                    />
                  ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>กลุ่มเรียน</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.groupCode}
                onValueChange={(value) => setFormData({...formData, groupCode: value})}
                style={styles.picker}
              >
                {groupCodes.map((group) => (
                  <Picker.Item 
                    key={group.value} 
                    label={group.label} 
                    value={group.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>สร้างบัญชีผู้ใช้</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  backButton: {
    padding: 5
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 40
  },
  placeholder: {
    width: 30
  },
  content: {
    flex: 1
  },
  form: {
    padding: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  roleButtonText: {
    color: '#333',
    fontSize: 14
  },
  roleButtonTextActive: {
    color: '#fff'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: '#fff'
  },
  picker: {
    height: 50
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  inputError: {
    borderColor: '#ff3b30'
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 5
  }
});

export default AddUserScreen;