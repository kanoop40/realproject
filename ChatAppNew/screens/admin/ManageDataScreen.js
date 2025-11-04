import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../service/api';
import SuccessTickAnimation from '../../components/SuccessTickAnimation';
import LoadingOverlay from '../../components/LoadingOverlay';

const ManageDataScreen = ({ navigation }) => {
  const [currentTab, setCurrentTab] = useState('departments');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [data, setData] = useState({
    departments: [],
    faculties: [],
    majors: {},
    groupCodes: {}
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    facultyId: '',
    majorId: ''
  });
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Load data from backend
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      console.log('🔄 Loading admin data from API...');

      // Load all data from backend
      const [deptRes, facRes, majRes, groupRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/departments`, config),
        axios.get(`${API_URL}/api/admin/faculties`, config),
        axios.get(`${API_URL}/api/admin/majors`, config),
        axios.get(`${API_URL}/api/admin/group-codes`, config)
      ]);

      console.log('✅ Admin data loaded successfully');

      setData({
        departments: deptRes.data.data || [],
        faculties: facRes.data.data || [],
        majors: majRes.data.data || {},
        groupCodes: groupRes.data.data || {}
      });
    } catch (error) {
      console.error('Error loading data:', error);
      console.log('⚠️ Using fallback data due to API error');
      
      // Use fallback data when API is not available
      setData({
        departments: [
          { id: '1', name: 'งานการเงิน', createdAt: new Date() },
          { id: '2', name: 'งานบุคลากร', createdAt: new Date() },
          { id: '3', name: 'งานทะเบียน', createdAt: new Date() },
          { id: '4', name: 'กองทุนเงินกู้ กยศ', createdAt: new Date() }
        ],
        faculties: [
          { id: '1', name: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
        ],
        majors: {
          '1': [
            { id: '1', name: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '2', name: '346 การบัญชี', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '3', name: '347 การจัดการ', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '4', name: '348 การตลาด', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
          ]
        },
        groupCodes: {
          '1': [
            { id: '1', name: 'DT26721N', majorId: '1', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '2', name: 'DT26722N', majorId: '1', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '3', name: 'DT26723N', majorId: '1', majorName: '345 เทคโนโลยีธุรกิจดิจิทัล', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
          ],
          '2': [
            { id: '4', name: 'ACC26701', majorId: '2', majorName: '346 การบัญชี', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '5', name: 'ACC26702', majorId: '2', majorName: '346 การบัญชี', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
          ],
          '3': [
            { id: '6', name: 'MGT26701', majorId: '3', majorName: '347 การจัดการ', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '7', name: 'MGT26702', majorId: '3', majorName: '347 การจัดการ', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
          ],
          '4': [
            { id: '8', name: 'MKT26701', majorId: '4', majorName: '348 การตลาด', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() },
            { id: '9', name: 'MKT26702', majorId: '4', majorName: '348 การตลาด', facultyId: '1', facultyName: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', createdAt: new Date() }
          ]
        }
      });

      Alert.alert('แจ้งเตือน', 'ไม่สามารถเชื่อมต่อ API ได้ ใช้ข้อมูลสำรองแทน');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่อ');
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      let endpoint = '';
      let payload = { name: formData.name.trim() };

      switch (currentTab) {
        case 'departments':
          endpoint = '/api/admin/departments';
          break;
        case 'faculties':
          endpoint = '/api/admin/faculties';
          break;
        case 'majors':
          if (!formData.facultyId) {
            Alert.alert('ข้อผิดพลาด', 'กรุณาเลือกคณะ');
            return;
          }
          endpoint = '/api/admin/majors';
          payload.facultyId = formData.facultyId;
          break;
        case 'groups':
          if (!formData.majorId) {
            Alert.alert('ข้อผิดพลาด', 'กรุณาเลือกสาขา');
            return;
          }
          endpoint = '/api/admin/group-codes';
          payload.majorId = formData.majorId;
          break;
      }

      try {
        // Try to use API first
        if (editingItem) {
          await axios.put(`${API_URL}${endpoint}/${editingItem.id}`, payload, config);
          Alert.alert('สำเร็จ', 'อัปเดตข้อมูลเรียบร้อยแล้ว');
        } else {
          await axios.post(`${API_URL}${endpoint}`, payload, config);
          setShowSuccess(true);
        }
        
        // Reload data from API
        await loadAllData();
      } catch (apiError) {
        console.log('⚠️ API not available, using local simulation');
        
        // Local simulation when API is not available
        const newData = { ...data };
        const newId = Date.now().toString();
        
        if (editingItem) {
          // Update existing item locally
          switch (currentTab) {
            case 'departments':
              const deptIndex = newData.departments.findIndex(d => d.id === editingItem.id);
              if (deptIndex !== -1) {
                newData.departments[deptIndex].name = formData.name.trim();
              }
              break;
            case 'faculties':
              const facIndex = newData.faculties.findIndex(f => f.id === editingItem.id);
              if (facIndex !== -1) {
                newData.faculties[facIndex].name = formData.name.trim();
              }
              break;
            case 'majors':
              // Find and update major
              Object.keys(newData.majors).forEach(facultyId => {
                const majorIndex = newData.majors[facultyId].findIndex(m => m.id === editingItem.id);
                if (majorIndex !== -1) {
                  newData.majors[facultyId][majorIndex].name = formData.name.trim();
                }
              });
              break;
            case 'groups':
              Object.keys(newData.groupCodes).forEach(majorId => {
                const groupIndex = newData.groupCodes[majorId].findIndex(g => g.id === editingItem.id);
                if (groupIndex !== -1) {
                  newData.groupCodes[majorId][groupIndex].name = formData.name.trim();
                }
              });
              break;
          }
          Alert.alert('สำเร็จ', 'อัปเดตข้อมูลเรียบร้อยแล้ว (โหมดออฟไลน์)');
        } else {
          // Add new item locally
          switch (currentTab) {
            case 'departments':
              newData.departments.push({
                id: newId,
                name: formData.name.trim(),
                createdAt: new Date()
              });
              break;
            case 'faculties':
              newData.faculties.push({
                id: newId,
                name: formData.name.trim(),
                createdAt: new Date()
              });
              newData.majors[newId] = [];
              break;
            case 'majors':
              if (!newData.majors[formData.facultyId]) {
                newData.majors[formData.facultyId] = [];
              }
              const faculty = newData.faculties.find(f => f.id === formData.facultyId);
              newData.majors[formData.facultyId].push({
                id: newId,
                name: formData.name.trim(),
                facultyId: formData.facultyId,
                facultyName: faculty?.name || '',
                createdAt: new Date()
              });
              newData.groupCodes[newId] = [];
              break;
            case 'groups':
              if (!newData.groupCodes[formData.majorId]) {
                newData.groupCodes[formData.majorId] = [];
              }
              let majorInfo = null;
              Object.values(newData.majors).flat().forEach(major => {
                if (major.id === formData.majorId) {
                  majorInfo = major;
                }
              });
              newData.groupCodes[formData.majorId].push({
                id: newId,
                name: formData.name.trim(),
                majorId: formData.majorId,
                majorName: majorInfo?.name || '',
                facultyId: majorInfo?.facultyId || '',
                facultyName: majorInfo?.facultyName || '',
                createdAt: new Date()
              });
              break;
          }
          setShowSuccess(true);
        }
        
        setData(newData);
      }

      // Reset form
      setFormData({ name: '', facultyId: '', majorId: '' });
      setEditingItem(null);

    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('ไม่สามารถบันทึกได้', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item) => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบ "${item.label || item.name}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const token = await AsyncStorage.getItem('userToken');
              
              const config = {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              };

              let endpoint = '';
              switch (currentTab) {
                case 'departments':
                  endpoint = `/api/admin/departments/${item.id}`;
                  break;
                case 'faculties':
                  endpoint = `/api/admin/faculties/${item.id}`;
                  break;
                case 'majors':
                  endpoint = `/api/admin/majors/${item.id}`;
                  break;
                case 'groups':
                  endpoint = `/api/admin/group-codes/${item.id}`;
                  break;
              }

              try {
                // Try API first
                await axios.delete(`${API_URL}${endpoint}`, config);
                Alert.alert('สำเร็จ', 'ลบข้อมูลเรียบร้อยแล้ว');
                await loadAllData();
              } catch (apiError) {
                console.log('⚠️ API not available, using local deletion');
                
                // Local deletion when API is not available
                const newData = { ...data };
                
                switch (currentTab) {
                  case 'departments':
                    newData.departments = newData.departments.filter(d => d.id !== item.id);
                    break;
                  case 'faculties':
                    newData.faculties = newData.faculties.filter(f => f.id !== item.id);
                    // Also remove related majors and group codes
                    delete newData.majors[item.id];
                    break;
                  case 'majors':
                    Object.keys(newData.majors).forEach(facultyId => {
                      newData.majors[facultyId] = newData.majors[facultyId].filter(m => m.id !== item.id);
                    });
                    // Also remove related group codes
                    delete newData.groupCodes[item.id];
                    break;
                  case 'groups':
                    Object.keys(newData.groupCodes).forEach(majorId => {
                      newData.groupCodes[majorId] = newData.groupCodes[majorId].filter(g => g.id !== item.id);
                    });
                    break;
                }
                
                setData(newData);
                Alert.alert('สำเร็จ', 'ลบข้อมูลเรียบร้อยแล้ว (โหมดออฟไลน์)');
              }

            } catch (error) {
              console.error('Error deleting data:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.label || item.name,
      facultyId: item.facultyId || '',
      majorId: item.majorId || ''
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ name: '', facultyId: '', majorId: '' });
  };

  const renderTabButton = (tabKey, title) => (
    <TouchableOpacity
      key={tabKey}
      style={[styles.tabButton, currentTab === tabKey && styles.tabButtonActive]}
      onPress={() => {
        setCurrentTab(tabKey);
        cancelEdit();
      }}
    >
      <Text style={[styles.tabButtonText, currentTab === tabKey && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderFormFields = () => {
    switch (currentTab) {
      case 'departments':
        return (
          <>
            <Text style={styles.formTitle}>
              {editingItem ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="ชื่อหน่วยงาน (เช่น งานการเงิน)"
            />
          </>
        );

      case 'faculties':
        return (
          <>
            <Text style={styles.formTitle}>
              {editingItem ? 'แก้ไขคณะ' : 'เพิ่มคณะใหม่'}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="ชื่อคณะ (เช่น วิศวกรรมศาสตร์)"
            />
          </>
        );

      case 'majors':
        return (
          <>
            <Text style={styles.formTitle}>
              {editingItem ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}
            </Text>
            
            <Text style={styles.label}>เลือกคณะ</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowFacultyModal(true)}
            >
              <Text style={[styles.dropdownText, !formData.facultyId && styles.placeholderText]}>
                {formData.facultyId ? 
                  data.faculties.find(f => f.id === formData.facultyId)?.name || 'เลือกคณะ' : 
                  'เลือกคณะ'
                }
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="ชื่อสาขา (เช่น 345 เทคโนโลยีธุรกิจดิจิทัล)"
            />
          </>
        );

      case 'groups':
        return (
          <>
            <Text style={styles.formTitle}>
              {editingItem ? 'แก้ไขกลุ่มเรียน' : 'เพิ่มกลุ่มเรียนใหม่'}
            </Text>
            
            <Text style={styles.label}>เลือกคณะ</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowFacultyModal(true)}
            >
              <Text style={[styles.dropdownText, !formData.facultyId && styles.placeholderText]}>
                {formData.facultyId ? 
                  data.faculties.find(f => f.id === formData.facultyId)?.name || 'เลือกคณะ' : 
                  'เลือกคณะ'
                }
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>เลือกสาขา</Text>
            <TouchableOpacity
              style={[styles.dropdown, !formData.facultyId && styles.dropdownDisabled]}
              onPress={() => formData.facultyId && setShowMajorModal(true)}
              disabled={!formData.facultyId}
            >
              <Text style={[styles.dropdownText, !formData.majorId && styles.placeholderText]}>
                {formData.majorId ? 
                  (data.majors[formData.facultyId] || []).find(m => m.id === formData.majorId)?.name || 'เลือกสาขา' : 
                  'เลือกสาขา'
                }
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="รหัสกลุ่มเรียน (เช่น DT26721N)"
            />
          </>
        );

      default:
        return null;
    }
  };

  const renderDataList = () => {
    let items = [];
    
    switch (currentTab) {
      case 'departments':
        items = data.departments;
        break;
      case 'faculties':
        items = data.faculties;
        break;
      case 'majors':
        items = Object.values(data.majors).flat();
        break;
      case 'groups':
        items = Object.values(data.groupCodes).flat();
        break;
    }

    return (
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          รายการ{currentTab === 'departments' ? 'หน่วยงาน' : 
                 currentTab === 'faculties' ? 'คณะ' : 
                 currentTab === 'majors' ? 'สาขา' : 'กลุ่มเรียน'}
        </Text>
        
        {items.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีข้อมูล</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id?.toString() || item.value}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || item.label}</Text>
                  {(currentTab === 'majors' || currentTab === 'groups') && item.facultyName && (
                    <Text style={styles.itemSubtext}>คณะ: {item.facultyName}</Text>
                  )}
                  {currentTab === 'groups' && item.majorName && (
                    <Text style={styles.itemSubtext}>สาขา: {item.majorName}</Text>
                  )}
                </View>
                
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={styles.actionButtonText}>แก้ไข</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={styles.actionButtonText}>ลบ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
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
        <Text style={styles.headerTitle}>จัดการข้อมูลระบบ</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderTabButton('departments', 'หน่วยงาน')}
          {renderTabButton('faculties', 'คณะ')}
          {renderTabButton('majors', 'สาขา')}
          {renderTabButton('groups', 'กลุ่มเรียน')}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Form Section */}
        <View style={styles.formSection}>
          {renderFormFields()}
          
          <View style={styles.buttonContainer}>
            {editingItem && (
              <TouchableOpacity
                style={[styles.submitButton, styles.cancelButton]}
                onPress={cancelEdit}
              >
                <Text style={[styles.submitButtonText, styles.cancelButtonText]}>
                  ยกเลิก
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'กำลังบันทึก...' : 
                 editingItem ? 'อัปเดต' : 'เพิ่มข้อมูล'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data List Section */}
        {renderDataList()}
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
              <Text style={styles.modalTitle}>เลือกคณะ</Text>
              <TouchableOpacity onPress={() => setShowFacultyModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={data.faculties}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData({...formData, facultyId: item.id, majorId: ''});
                    setShowFacultyModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
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
              data={data.majors[formData.facultyId] || []}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData({...formData, majorId: item.id});
                    setShowMajorModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Success Animation */}
      <SuccessTickAnimation
        visible={showSuccess}
        onComplete={() => setShowSuccess(false)}
      />

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isLoading}
        message="กำลังประมวลผล..."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
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
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabButtonActive: {
    borderBottomColor: '#007AFF'
  },
  tabButtonText: {
    fontSize: 16,
    color: '#666'
  },
  tabButtonTextActive: {
    color: '#007AFF',
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    padding: 15
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 15,
    color: '#007AFF',
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15
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
    marginBottom: 15
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666'
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    fontStyle: 'italic',
    paddingVertical: 20
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  itemSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center'
  },
  editButton: {
    backgroundColor: '#007AFF'
  },
  deleteButton: {
    backgroundColor: '#ff3b30'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
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
  }
});

export default ManageDataScreen;