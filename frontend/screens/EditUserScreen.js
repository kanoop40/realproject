import React, { useState, useEffect } from 'react';
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

const faculties = [
  { label: 'เลือกคณะ', value: '1' },
  { label: 'วิศวกรรมศาสตร์', value: 'Engineering' },
  { label: 'วิทยาศาสตร์', value: 'Science' },
];

const majors = {
  Engineering: [
    { label: 'เลือกสาขา', value: '1' },
    { label: 'วิศวกรรมคอมพิวเตอร์', value: 'Computer Engineering' },
    { label: 'วิศวกรรมไฟฟ้า', value: 'Electrical Engineering' },
  ],
  Science: [
    { label: 'เลือกสาขา', value: '1' },
    { label: 'วิทยาการคอมพิวเตอร์', value: 'Computer Science' },
    { label: 'คณิตศาสตร์', value: 'Mathematics' },
  ],
  '1': [
    { label: 'เลือกสาขา', value: '1' }
  ]
};

const groupCodes = [
  { label: 'เลือกกลุ่มเรียน', value: '1' },
  { label: 'CE01', value: 'CE01' },
  { label: 'CE02', value: 'CE02' },
  { label: 'CE03', value: 'CE03' },
];

const EditUserScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    faculty: '1',
    major: '1',
    groupCode: '1'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [initialRole, setInitialRole] = useState('');

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const response = await axios.get(`${API_URL}/api/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userData = response.data;
    
    // กำหนดค่าเริ่มต้นให้ครบทุกฟิลด์
    setFormData({
      username: userData.username || '',
      password: '', // ไม่แสดงรหัสผ่านเดิม
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      role: userData.role || 'student',
      faculty: userData.faculty || '1',
      major: userData.major || '1',
      groupCode: userData.groupCode || '1'
    });
    setInitialRole(userData.role);
  } catch (error) {
    console.error('Error loading user data:', error);
    Alert.alert(
      'Error',
      'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
      [
        {
          text: 'ตกลง',
          onPress: () => navigation.goBack()
        }
      ]
    );
  }
};

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
    if (!formData.firstName) newErrors.firstName = 'กรุณากรอกชื่อ';
    if (!formData.lastName) newErrors.lastName = 'กรุณากรอกนามสกุล';
    if (!formData.email) newErrors.email = 'กรุณากรอกอีเมล';

    if (formData.role === 'student' || formData.role === 'teacher') {
      if (!formData.faculty) newErrors.faculty = 'กรุณาเลือกคณะ';
      if (!formData.major) newErrors.major = 'กรุณาเลือกสาขา';
      if (formData.role === 'student' && !formData.groupCode) {
        newErrors.groupCode = 'กรุณาเลือกกลุ่มเรียน';
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
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

      let dataToSend = {
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role
      };

      // เพิ่มรหัสผ่านถ้ามีการกรอก
      if (formData.password) {
        dataToSend.password = formData.password;
      }

      // กำหนดค่าตาม role
      if (formData.role === 'admin') {
        dataToSend = {
          ...dataToSend,
          faculty: '1',
          major: '1',
          groupCode: '1'
        };
      } else if (formData.role === 'teacher') {
        dataToSend = {
          ...dataToSend,
          faculty: formData.faculty,
          major: formData.major,
          groupCode: '1'
        };
      } else { // student
        dataToSend = {
          ...dataToSend,
          faculty: formData.faculty,
          major: formData.major,
          groupCode: formData.groupCode
        };
      }

      await axios.put(`${API_URL}/api/users/${userId}`, dataToSend, config);
      
      Alert.alert(
        'สำเร็จ',
        'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              navigation.navigate('Admin', { refresh: true });
            }
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'ไม่สามารถแก้ไขข้อมูลได้';
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
            errorMessage = 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูล';
            break;
          case 409:
            errorMessage = 'ชื่อผู้ใช้หรืออีเมลนี้มีในระบบแล้ว';
            break;
          default:
            errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล';
        }
      }
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowField = (fieldName) => {
    try {
      switch (fieldName) {
        case 'faculty':
        case 'major':
          return formData.role !== 'admin';
        case 'groupCode':
          return formData.role === 'student';
        default:
          return true;
      }
    } catch (error) {
      console.error('Error in shouldShowField:', error);
      return false;
    }
  };

 return (
  <SafeAreaView style={styles.container}>
    {/* ... header section ... */}
    
    <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.userSummary}>
        <Text style={styles.summaryTitle}>ข้อมูลผู้ใช้</Text>
        <Text style={styles.summaryText}>Username: {formData.username}</Text>
        <Text style={styles.summaryText}>
          ชื่อ-นามสกุล: {formData.firstName} {formData.lastName}
        </Text>
        <Text style={styles.summaryText}>อีเมล: {formData.email}</Text>
        <Text style={styles.summaryText}>
          สถานะ: {
            formData.role === 'student' ? 'นักศึกษา' :
            formData.role === 'teacher' ? 'อาจารย์' : 'ผู้ดูแลระบบ'
          }
        </Text>
        {formData.role !== 'admin' && (
          <>
            <Text style={styles.summaryText}>
              คณะ: {
                faculties.find(f => f.value === formData.faculty)?.label || 'ไม่ระบุ'
              }
            </Text>
            <Text style={styles.summaryText}>
              สาขา: {
                majors[formData.faculty]?.find(m => m.value === formData.major)?.label || 'ไม่ระบุ'
              }
            </Text>
          </>
        )}
        {formData.role === 'student' && (
          <Text style={styles.summaryText}>
            กลุ่มเรียน: {
              groupCodes.find(g => g.value === formData.groupCode)?.label || 'ไม่ระบุ'
            }
          </Text>
        )}
      </View>

      <View style={styles.form}>
        {/* ... existing form fields ... */}
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
  },
  userSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  }
});

export default EditUserScreen;