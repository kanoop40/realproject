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

const faculties = [
  { label: 'เลือกคณะ', value: '1' },
  { label: 'วิศวกรรมศาสตร์', value: 'Engineering' },
  { label: 'วิทยาศาสตร์', value: 'Science' },
  { label: 'ครุศาสตร์อุตสาหกรรม', value: 'Industrial Education' },
  { label: 'เทคโนโลยีการเกษตร', value: 'Agricultural Technology' },
];

const majors = {
  Engineering: [
    { label: 'เลือกสาขา', value: '1' },
    { label: 'วิศวกรรมคอมพิวเตอร์', value: 'Computer Engineering' },
    { label: 'วิศวกรรมไฟฟ้า', value: 'Electrical Engineering' },
    { label: 'วิศวกรรมเครื่องกล', value: 'Mechanical Engineering' },
    { label: 'วิศวกรรมโยธา', value: 'Civil Engineering' },
  ],
  Science: [
    { label: 'เลือกสาขา', value: '1' },
    { label: 'วิทยาการคอมพิวเตอร์', value: 'Computer Science' },
    { label: 'คณิตศาสตร์', value: 'Mathematics' },
    { label: 'เคมี', value: 'Chemistry' },
    { label: 'ฟิสิกส์', value: 'Physics' },
  ],
  'Industrial Education': [
    { label: 'เลือกสาขา', value: '1' },
    { label: 'ครุศาสตร์วิศวกรรม', value: 'Engineering Education' },
    { label: 'ครุศาสตร์เทคโนโลยี', value: 'Technology Education' },
  ],
  'Agricultural Technology': [
    { label: 'เลือกสาขา', value: '1' },
    { label: 'เทคโนโลยีการผลิตพืช', value: 'Crop Production Technology' },
    { label: 'เทคโนโลยีการผลิตสัตว์', value: 'Animal Production Technology' },
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
  { label: 'EE01', value: 'EE01' },
  { label: 'EE02', value: 'EE02' },
  { label: 'ME01', value: 'ME01' },
  { label: 'ME02', value: 'ME02' },
  { label: 'CV01', value: 'CV01' },
  { label: 'CV02', value: 'CV02' },
];

const AddUserScreen = ({ navigation }) => {
 const [formData, setFormData] = useState({
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'student', // ค่าเริ่มต้นเป็น student
  faculty: '1', // ค่าเริ่มต้นต้องตรงกับ value ใน faculties
  major: '1',
  groupCode: '1'
});
const handleRoleChange = (role) => {
  setFormData({
    ...formData,
    role,
    faculty: '1', // รีเซ็ตเป็นค่าเริ่มต้น
    major: '1',
    groupCode: '1'
  });
};
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

const validateForm = () => {
  const newErrors = {};
  if (!formData.username) newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
  if (!formData.password) newErrors.password = 'กรุณากรอกรหัสผ่าน';
  if (!formData.firstName) newErrors.firstName = 'กรุณากรอกชื่อ';
  if (!formData.lastName) newErrors.lastName = 'กรุณากรอกนามสกุล';
  if (!formData.email) newErrors.email = 'กรุณากรอกอีเมล';
  
  // ตรวจสอบเฉพาะกรณีที่เป็นนักศึกษาหรืออาจารย์
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

    // สร้างข้อมูลที่จะส่งตาม role
     let dataToSend = {
    username: formData.username,
    password: formData.password,
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    role: formData.role
  };

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
      faculty: formData.faculty || '1',
      major: formData.major || '1',
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


    console.log('Sending data:', dataToSend);

    const response = await axios.post(`${API_URL}/api/users`, dataToSend, config);
    
    Alert.alert(
      'สำเร็จ',
      'เพิ่มผู้ใช้เรียบร้อยแล้ว',
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
    // ... error handling ...
  }
};

 const shouldShowField = (fieldName) => {
  try {
    switch (fieldName) {
      case 'faculty':
      case 'major':
        // แก้ไขเงื่อนไขให้ตรงกับค่า value ที่เป็นไปได้
        return formData.role === 'student' || formData.role === 'teacher';
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
              style={[styles.input, errors.username && styles.inputError]}
              value={formData.username}
              onChangeText={(text) => {
                setFormData({...formData, username: text});
                if (errors.username) setErrors({...errors, username: ''});
              }}
              placeholder="กรอกชื่อผู้ใช้"
              autoCapitalize="none"
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={(text) => {
                setFormData({...formData, password: text});
                if (errors.password) setErrors({...errors, password: ''});
              }}
              placeholder="กรอกรหัสผ่าน"
              secureTextEntry
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อ</Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              value={formData.firstName}
              onChangeText={(text) => {
                setFormData({...formData, firstName: text});
                if (errors.firstName) setErrors({...errors, firstName: ''});
              }}
              placeholder="กรอกชื่อ"
            />
            {errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>นามสกุล</Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              value={formData.lastName}
              onChangeText={(text) => {
                setFormData({...formData, lastName: text});
                if (errors.lastName) setErrors({...errors, lastName: ''});
              }}
              placeholder="กรอกนามสกุล"
            />
            {errors.lastName && (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => {
                setFormData({...formData, email: text});
                if (errors.email) setErrors({...errors, email: ''});
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
        onPress={() => handleRoleChange(role)}
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


{shouldShowField('faculty') && (
 <View style={styles.inputGroup}>
  <Text style={styles.label}>คณะ</Text>
  <View style={[styles.pickerContainer, errors.faculty && styles.inputError]}>
    <Picker
      selectedValue={formData.faculty}
      onValueChange={(value) => {
        setFormData({
          ...formData,
          faculty: value,
          major: '1',
          groupCode: '1'
        });
        if (errors.faculty) setErrors({...errors, faculty: ''});
      }}
      style={styles.picker}
      mode="dropdown" // เพิ่มบรรทัดนี้
    >
      {faculties.map((faculty) => (
        <Picker.Item 
          key={faculty.value} 
          label={faculty.label} 
          value={faculty.value}
          color="#333" // เพิ่มบรรทัดนี้
        />
      ))}
    </Picker>
  </View>
  {errors.faculty && <Text style={styles.errorText}>{errors.faculty}</Text>}
</View>
)}
{shouldShowField('major') && (
  <View style={styles.inputGroup}>
  <Text style={styles.label}>สาขา</Text>
  <View style={[styles.pickerContainer, errors.major && styles.inputError]}>
    <Picker
      selectedValue={formData.major}
      onValueChange={(value) => {
        setFormData({
          ...formData,
          major: value,
          groupCode: '1'
        });
        if (errors.major) setErrors({...errors, major: ''});
      }}
      style={styles.picker}
      mode="dropdown" // เพิ่มบรรทัดนี้
    >
      {(majors[formData.faculty] || majors['1']).map((major) => (
        <Picker.Item 
          key={major.value} 
          label={major.label} 
          value={major.value}
          color="#333" // เพิ่มบรรทัดนี้
        />
      ))}
    </Picker>
  </View>
  {errors.major && <Text style={styles.errorText}>{errors.major}</Text>}
</View>
)}
{shouldShowField('groupCode') && (
  <View style={styles.inputGroup}>
  <Text style={styles.label}>กลุ่มเรียน</Text>
  <View style={[styles.pickerContainer, errors.groupCode && styles.inputError]}>
    <Picker
      selectedValue={formData.groupCode}
      onValueChange={(value) => {
        setFormData({
          ...formData,
          groupCode: value
        });
        if (errors.groupCode) setErrors({...errors, groupCode: ''});
      }}
      style={styles.picker}
      mode="dropdown" // เพิ่มบรรทัดนี้
    >
      {groupCodes.map((group) => (
        <Picker.Item 
          key={group.value} 
          label={group.label} 
          value={group.value}
          color="#333" // เพิ่มบรรทัดนี้
        />
      ))}
    </Picker>
  </View>
  {errors.groupCode && <Text style={styles.errorText}>{errors.groupCode}</Text>}
</View>
)}

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
    color: '#007AFF',
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
    backgroundColor: '#fff',
    overflow: 'hidden' // เพิ่มบรรทัดนี้
  },
   picker: {
    height: 50,
    width: '100%', // เพิ่มบรรทัดนี้
    color: '#333', // เพิ่มบรรทัดนี้
    backgroundColor: '#fff' // เพิ่มบรรทัดนี้
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