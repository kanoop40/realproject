import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_URL } from '../../service/api'; // ใช้ api และ API_URL เดียวกัน
import SuccessTickAnimation from '../../components/SuccessTickAnimation';
import LoadingOverlay from '../../components/LoadingOverlay';

const faculties = [
  { label: 'เลือกคณะ', value: '1' },
  { label: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', value: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ' },
 
];

// หน่วยงานสำหรับเจ้าหน้าที่
const departments = [
  { label: 'เลือกหน่วยงาน', value: '1' },
  { label: 'การเงิน', value: 'การเงิน' },


];

const majors = {
  '1': [
    { label: 'เลือกสาขา', value: '1' }
  ],
  'บริหารธุรกิจและเทคโนโลยีสารสนเทศ': [
    { label: 'เลือกสาขา', value: '1' },
    { label: '345 เทคโนโลยีธุรกิจดิจิทัล', value: '345 เทคโนโลยีธุรกิจดิจิทัล' },
    { label: '346 การบัญชี', value: '346 การบัญชี' },
    { label: '347 การจัดการ', value: '347 การจัดการ' },
    { label: '348 การตลาด', value: '348 การตลาด' },
    
  ]
  
};

const groupCodes = {
  '1': [
    { label: 'เลือกกลุ่มเรียน', value: '1' }
  ],
  '345 เทคโนโลยีธุรกิจดิจิทัล': [
    { label: 'เลือกกลุ่มเรียน', value: '1' },
    { label: 'DT26721N', value: 'DT26721N' },
    { label: 'DT26722N', value: 'DT26722N' },
    { label: 'DT26723N', value: 'DT26723N' }
  ],
  '346 การบัญชี': [
    { label: 'เลือกกลุ่มเรียน', value: '1' },
    { label: 'ACC26701', value: 'ACC26701' },
    { label: 'ACC26702', value: 'ACC26702' }
  ],
  '347 การจัดการ': [
    { label: 'เลือกกลุ่มเรียน', value: '1' },
    { label: 'MGT26701', value: 'MGT26701' },
    { label: 'MGT26702', value: 'MGT26702' }
  ],
  '348 การตลาด': [
    { label: 'เลือกกลุ่มเรียน', value: '1' },
    { label: 'MKT26701', value: 'MKT26701' },
    { label: 'MKT26702', value: 'MKT26702' }
  ]
  
};

const AddUserScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'student',
    faculty: '1',
    major: '1',
    groupCode: '1'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectFaculty = (faculty) => {
    const newFormData = {
      ...formData,
      faculty: faculty.value,
      major: '1',
      groupCode: '1'
    };

    // ถ้าเป็นเจ้าหน้าที่ ให้กำหนดชื่อตามหน่วยงาน
    if (formData.role === 'staff') {
      newFormData.firstName = faculty.label; // ใช้ชื่อหน่วยงานเป็นชื่อ
      newFormData.lastName = ''; // นามสกุลเป็นค่าว่าง
      newFormData.email = '-'; // อีเมลเป็นค่าว่าง
    }

    setFormData(newFormData);
    if (errors.faculty) setErrors({...errors, faculty: ''});
    setShowFacultyModal(false);
  };

  const selectMajor = (major) => {
    setFormData({
      ...formData,
      major: major.value,
      groupCode: '1'
    });
    if (errors.major) setErrors({...errors, major: ''});
    setShowMajorModal(false);
  };

  const selectGroup = (group) => {
    setFormData({
      ...formData,
      groupCode: group.value
    });
    if (errors.groupCode) setErrors({...errors, groupCode: ''});
    setShowGroupModal(false);
  };

  const getFacultyLabel = () => {
    if (formData.role === 'staff') {
      const department = departments.find(d => d.value === formData.faculty);
      return department ? department.label : 'เลือกหน่วยงาน';
    } else {
      const faculty = faculties.find(f => f.value === formData.faculty);
      return faculty ? faculty.label : 'เลือกคณะ';
    }
  };

  const getMajorLabel = () => {
    const availableMajors = majors[formData.faculty] || majors['1'];
    const major = availableMajors.find(m => m.value === formData.major);
    return major ? major.label : 'เลือกสาขา';
  };

  const getGroupLabel = () => {
    const availableGroups = groupCodes[formData.major] || groupCodes['1'];
    const group = availableGroups.find(g => g.value === formData.groupCode);
    return group ? group.label : 'เลือกกลุ่มเรียน';
  };

  const handleRoleChange = (role) => {
    const newFormData = {
      ...formData,
      role,
      faculty: '1',
      major: '1',
      groupCode: '1'
    };

    // ถ้าเปลี่ยนจากเจ้าหน้าที่เป็น role อื่น ให้รีเซ็ตชื่อและนามสกุล
    if (formData.role === 'staff' && role !== 'staff') {
      newFormData.firstName = '';
      newFormData.lastName = '';
      newFormData.email = '';
    }

    setFormData(newFormData);
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    // แสดงตัวเลือกหลังจาก animation เสร็จ
    Alert.alert(
      'เพิ่มผู้ใช้สำเร็จ',
      'คุณต้องการทำอะไรต่อไป?',
      [
        {
          text: 'เพิ่มผู้ใช้อีกคน',
          style: 'default',
          onPress: () => {
            // อยู่ในหน้าเดิมเพื่อเพิ่มผู้ใช้คนต่อไป
          }
        },
        {
          text: 'กลับหน้าแอดมิน',
          style: 'cancel',
          onPress: () => {
            setShowFacultyModal(false);
            setShowMajorModal(false);
            setShowGroupModal(false);
            navigation.navigate('Admin', { refresh: true });
          }
        }
      ]
    );
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
    if (!formData.password) newErrors.password = 'กรุณากรอกรหัสผ่าน';
    
    // เจ้าหน้าที่ไม่ต้องกรอกชื่อและนามสกุล
    if (formData.role !== 'staff') {
      if (!formData.firstName) newErrors.firstName = 'กรุณากรอกชื่อ';
      if (!formData.lastName) newErrors.lastName = 'กรุณากรอกนามสกุล';
    }
    
    // อีเมลไม่จำเป็นสำหรับทุก role แต่ถ้ากรอกมาต้องถูกรูปแบบ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && formData.email.trim() !== '' && !emailRegex.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    // ตรวจสอบเงื่อนไขตาม role
    if (formData.role === 'student') {
      // นักศึกษา: ต้องกรอกคณะ สาขา และกลุ่มเรียน
      if (formData.faculty === '1') {
        newErrors.faculty = 'กรุณาเลือกคณะ';
      }
      if (formData.major === '1') {
        newErrors.major = 'กรุณาเลือกสาขา';
      }
      if (formData.groupCode === '1') {
        newErrors.groupCode = 'กรุณาเลือกกลุ่มเรียน';
      }
    } else if (formData.role === 'teacher') {
      // อาจารย์: ต้องกรอกคณะ และสาขา (ไม่ต้องกลุ่มเรียน)
      if (formData.faculty === '1') {
        newErrors.faculty = 'กรุณาเลือกคณะ';
      }
      if (formData.major === '1') {
        newErrors.major = 'กรุณาเลือกสาขา';
      }
    } else if (formData.role === 'staff') {
      // เจ้าหน้าที่: ต้องกรอกเฉพาะหน่วยงาน
      if (formData.faculty === '1') {
        newErrors.faculty = 'กรุณาเลือกหน่วยงาน';
      }
    }
    // admin: ไม่ต้องกรอกอะไรเพิ่ม

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน\n(อีเมลไม่จำเป็น แต่ถ้ากรอกต้องถูกรูปแบบ)');
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
        password: formData.password,
        role: formData.role
      };

      // สำหรับเจ้าหน้าที่ ใช้ชื่อหน่วยงานเป็นชื่อ และนามสกุลเป็นค่าว่าง
      if (formData.role === 'staff') {
        const selectedDepartment = departments.find(d => d.value === formData.faculty);
        dataToSend.firstName = selectedDepartment ? selectedDepartment.label : '';
        dataToSend.lastName = ''; // ส่งค่าว่าง เพราะ model แก้ไขแล้ว
        // เจ้าหน้าที่ไม่มีอีเมล - ไม่ส่งฟิลด์ email เลย
      } else {
        // สำหรับ role อื่นๆ ใช้ข้อมูลจาก form
        dataToSend.firstName = formData.firstName;
        dataToSend.lastName = formData.lastName;
        
        // เพิ่มอีเมลเฉพาะเมื่อมีการกรอกมาจริงๆ และไม่เป็นค่าว่าง
        if (formData.email && formData.email.trim() !== '' && formData.email.trim() !== '-') {
          dataToSend.email = formData.email.trim();
        }
        // ถ้าไม่กรอกอีเมล หรือเป็นค่าว่าง จะไม่ส่งฟิลด์ email ไปใน request
      }

      if (formData.role === 'admin') {
        // ผู้ดูแลระบบ: ไม่ต้องกรอกข้อมูลเพิ่ม
        dataToSend = {
          ...dataToSend,
          faculty: '1',
          department: '1',
          major: '1',
          groupCode: '1'
        };
      } else if (formData.role === 'teacher') {
        // อาจารย์: กรอกคณะและสาขา
        dataToSend = {
          ...dataToSend,
          faculty: formData.faculty,
          department: formData.faculty, // ใช้ค่าเดียวกับ faculty
          major: formData.major,
          groupCode: '1'
        };
      } else if (formData.role === 'staff') {
        // เจ้าหน้าที่: กรอกเฉพาะหน่วยงาน
        dataToSend = {
          ...dataToSend,
          faculty: formData.faculty, // หน่วยงานที่เลือก
          department: formData.faculty, // ใช้ค่าเดียวกับ faculty
          major: '1',
          groupCode: '1'
        };
      } else if (formData.role === 'student') {
        // นักศึกษา: กรอกครบทุกข้อมูล
        dataToSend = {
          ...dataToSend,
          faculty: formData.faculty,
          department: formData.faculty, // ใช้ค่าเดียวกับ faculty
          major: formData.major,
          groupCode: formData.groupCode
        };
      }

      await axios.post(`${API_URL}/api/users`, dataToSend, config);

      // Reset form หลังจากสร้างผู้ใช้สำเร็จ
      setFormData({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        role: 'student',
        faculty: '1',
        major: '1',
        groupCode: '1'
      });
      setErrors({});

      // แสดง SuccessTickAnimation แทน Alert.alert
      setShowSuccess(true);
    } catch (error) {
      console.log('Error creating user:', error.response?.data || error.message);
      let errorMessage = 'ไม่สามารถเพิ่มผู้ใช้ได้';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'ข้อมูลไม่ถูกต้องหรือมีผู้ใช้นี้ในระบบแล้ว';
      } else if (error.response?.status === 401) {
        errorMessage = 'ไม่มีสิทธิ์ในการเพิ่มผู้ใช้';
        navigation.replace('Login');
        return;
      }
      
      Alert.alert('ผิดพลาด', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowField = (fieldName) => {
    switch (fieldName) {
      case 'faculty':
        return formData.role === 'student' || formData.role === 'teacher' || formData.role === 'staff';
      case 'major':
        return formData.role === 'student' || formData.role === 'teacher';
      case 'groupCode':
        return formData.role === 'student';
      default:
        return true;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
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

          {formData.role !== 'staff' && (
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
          )}

          {formData.role !== 'staff' && (
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
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              อีเมล {formData.role === 'staff' ? '(เจ้าหน้าที่ไม่จำเป็น)' : '(ไม่จำเป็น)'}
            </Text>
            {formData.role !== 'staff' && (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({...formData, email: text});
                  if (errors.email) setErrors({...errors, email: ''});
                }}
                placeholder="กรอกอีเมล (ไม่จำเป็น)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
            {formData.role === 'staff' && (
              <View style={styles.disabledInput}>
                <Text style={styles.disabledInputText}>
                  เจ้าหน้าที่ไม่ต้องระบุอีเมล
                </Text>
              </View>
            )}
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>สถานะ</Text>
            <View style={styles.roleButtons}>
              {['student', 'teacher', 'staff', 'admin'].map((role) => (
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
                    role === 'teacher' ? 'อาจารย์' :
                    role === 'staff' ? 'เจ้าหน้าที่' : 'ผู้ดูแลระบบ'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {shouldShowField('faculty') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {formData.role === 'staff' ? 'หน่วยงาน' : 'คณะ'}
              </Text>
              {formData.role === 'staff' && (
                <Text style={styles.helperText}>
                  * ชื่อผู้ใช้จะถูกกำหนดตามหน่วยงานที่เลือก
                </Text>
              )}
              <TouchableOpacity
                style={[styles.dropdown, errors.faculty && styles.inputError]}
                onPress={() => setShowFacultyModal(true)}
              >
                <Text style={[styles.dropdownText, formData.faculty === '1' && styles.placeholderText]}>
                  {getFacultyLabel()}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {errors.faculty && <Text style={styles.errorText}>{errors.faculty}</Text>}
              {formData.role === 'staff' && formData.faculty !== '1' && (
                <Text style={styles.previewText}>
                  ชื่อผู้ใช้จะเป็น: {getFacultyLabel()} (ไม่มีนามสกุล)
                </Text>
              )}
            </View>
          )}

          {shouldShowField('major') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>สาขา</Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.major && styles.inputError, formData.faculty === '1' && styles.dropdownDisabled]}
                onPress={() => formData.faculty !== '1' && setShowMajorModal(true)}
                disabled={formData.faculty === '1'}
              >
                <Text style={[styles.dropdownText, formData.major === '1' && styles.placeholderText]}>
                  {getMajorLabel()}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {errors.major && <Text style={styles.errorText}>{errors.major}</Text>}
            </View>
          )}

          {shouldShowField('groupCode') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>กลุ่มเรียน</Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.groupCode && styles.inputError, formData.major === '1' && styles.dropdownDisabled]}
                onPress={() => formData.major !== '1' && setShowGroupModal(true)}
                disabled={formData.major === '1'}
              >
                <Text style={[styles.dropdownText, formData.groupCode === '1' && styles.placeholderText]}>
                  {getGroupLabel()}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {errors.groupCode && <Text style={styles.errorText}>{errors.groupCode}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>สร้างบัญชีผู้ใช้</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Faculty Modal */}
      <Modal
        visible={showFacultyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFacultyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formData.role === 'staff' ? 'เลือกหน่วยงาน' : 'เลือกคณะ'}
              </Text>
              <TouchableOpacity onPress={() => setShowFacultyModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={formData.role === 'staff' ? 
                departments.filter(d => d.value !== '1') : 
                faculties.filter(f => f.value !== '1')
              }
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectFaculty(item)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Major Modal */}
      <Modal
        visible={showMajorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMajorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกสาขา</Text>
              <TouchableOpacity onPress={() => setShowMajorModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={(majors[formData.faculty] || majors['1']).filter(m => m.value !== '1')}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectMajor(item)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Group Modal */}
      <Modal
        visible={showGroupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เลือกกลุ่มเรียน</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={(groupCodes[formData.major] || groupCodes['1']).filter(g => g.value !== '1')}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectGroup(item)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Success Animation */}
      <SuccessTickAnimation
        visible={showSuccess}
        onComplete={handleSuccessComplete}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isLoading}
        message="กำลังสร้างบัญชีผู้ใช้..."
      />
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
  backIcon: {
    fontSize: 24,
    color: '#333',
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
    gap: 8
  },
  roleButton: {
    flex: 1,
    padding: 10,
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
    fontSize: 12
  },
  roleButtonTextActive: {
    color: '#fff'
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50
  },
  dropdownDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
    flex: 1
  },
  placeholderText: {
    color: '#999'
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    padding: 0
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  modalClose: {
    fontSize: 18,
    color: '#666'
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalItemText: {
    fontSize: 16,
    color: '#333'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 5,
    minHeight: 50,
    overflow: 'hidden'
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#000',
    backgroundColor: '#fff'
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
  helperText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
    fontStyle: 'italic'
  },
  previewText: {
    color: '#007AFF',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500'
  },
  disabledInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    minHeight: 50
  },
  disabledInputText: {
    color: '#999',
    fontSize: 16,
    fontStyle: 'italic'
  }
});

export default AddUserScreen;