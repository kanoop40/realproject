import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../service/api';

// Helper function to get auth token
const getAuthToken = async () => {
  return await AsyncStorage.getItem('userToken');
};

// Helper function to create auth config
const createAuthConfig = async () => {
  const token = await getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Get all departments
export const getDepartments = async () => {
  try {
    const config = await createAuthConfig();
    const response = await axios.get(`${API_URL}/api/admin/departments`, config);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
};

// Get all faculties
export const getFaculties = async () => {
  try {
    const config = await createAuthConfig();
    const response = await axios.get(`${API_URL}/api/admin/faculties`, config);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching faculties:', error);
    return [];
  }
};

// Get all majors
export const getMajors = async () => {
  try {
    const config = await createAuthConfig();
    const response = await axios.get(`${API_URL}/api/admin/majors`, config);
    return response.data.data || {};
  } catch (error) {
    console.error('Error fetching majors:', error);
    return {};
  }
};

// Get all group codes
export const getGroupCodes = async () => {
  try {
    const config = await createAuthConfig();
    const response = await axios.get(`${API_URL}/api/admin/group-codes`, config);
    return response.data.data || {};
  } catch (error) {
    console.error('Error fetching group codes:', error);
    return {};
  }
};

// Convert backend data to dropdown format
export const formatForDropdown = (data, defaultLabel = 'เลือก') => {
  if (Array.isArray(data)) {
    return [
      { label: defaultLabel, value: '1' },
      ...data.map(item => ({ label: item.name, value: item.id || item.name }))
    ];
  }
  return [{ label: defaultLabel, value: '1' }];
};

// Convert backend majors data to format expected by AddUserScreen
export const formatMajorsData = (majorsData, facultiesData) => {
  const formatted = {
    '1': [{ label: 'เลือกสาขา', value: '1' }]
  };

  // สร้าง mapping สำหรับแต่ละคณะ
  facultiesData.forEach(faculty => {
    formatted[faculty.id] = [
      { label: 'เลือกสาขา', value: '1' },
      ...(majorsData[faculty.id] || []).map(major => ({
        label: major.name,
        value: major.name // ใช้ชื่อเป็น value เหมือนเดิม
      }))
    ];
  });

  return formatted;
};

// Convert backend group codes data to format expected by AddUserScreen
export const formatGroupCodesData = (groupCodesData, majorsData) => {
  const formatted = {
    '1': [{ label: 'เลือกกลุ่มเรียน', value: '1' }]
  };

  // สร้าง mapping สำหรับแต่ละสาขา
  Object.values(majorsData).flat().forEach(major => {
    formatted[major.name] = [
      { label: 'เลือกกลุ่มเรียน', value: '1' },
      ...(groupCodesData[major.id] || []).map(group => ({
        label: group.name,
        value: group.name // ใช้ชื่อเป็น value เหมือนเดิม
      }))
    ];
  });

  return formatted;
};

// Load all data and format for AddUserScreen
export const loadAllSystemData = async () => {
  try {
    const [departments, faculties, majors, groupCodes] = await Promise.all([
      getDepartments(),
      getFaculties(),
      getMajors(),
      getGroupCodes()
    ]);

    return {
      departments: formatForDropdown(departments, 'เลือกหน่วยงาน'),
      faculties: formatForDropdown(faculties, 'เลือกคณะ'),
      majors: formatMajorsData(majors, faculties),
      groupCodes: formatGroupCodesData(groupCodes, majors)
    };
  } catch (error) {
    console.error('Error loading system data:', error);
    // Return default structure if API fails
    return {
      departments: [
        { label: 'เลือกหน่วยงาน', value: '1' },
        { label: 'งานการเงิน', value: 'งานการเงิน' },
        { label: 'งานบุคลากร', value: 'งานบุคลากร' },
        { label: 'งานทะเบียน', value: 'งานทะเบียน' },
        { label: 'กองทุนเงินกู้ กยศ', value: 'กองทุนเงินกู้ กยศ' }
      ],
      faculties: [
        { label: 'เลือกคณะ', value: '1' },
        { label: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ', value: 'บริหารธุรกิจและเทคโนโลยีสารสนเทศ' }
      ],
      majors: {
        '1': [{ label: 'เลือกสาขา', value: '1' }],
        'บริหารธุรกิจและเทคโนโลยีสารสนเทศ': [
          { label: 'เลือกสาขา', value: '1' },
          { label: '345 เทคโนโลยีธุรกิจดิจิทัล', value: '345 เทคโนโลยีธุรกิจดิจิทัล' },
          { label: '346 การบัญชี', value: '346 การบัญชี' },
          { label: '347 การจัดการ', value: '347 การจัดการ' },
          { label: '348 การตลาด', value: '348 การตลาด' }
        ]
      },
      groupCodes: {
        '1': [{ label: 'เลือกกลุ่มเรียน', value: '1' }],
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
      }
    };
  }
};