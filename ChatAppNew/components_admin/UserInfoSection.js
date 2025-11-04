import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

const UserInfoSection = ({ user }) => {
  const translateRole = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'อาจารย์';
      case 'student': return 'นักศึกษา';
      default: return role;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
      
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>ชื่อผู้ใช้:</Text>
        <Text style={styles.infoValue}>{user.username}</Text>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>ชื่อ:</Text>
        <Text style={styles.infoValue}>{user.firstName}</Text>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>นามสกุล:</Text>
        <Text style={styles.infoValue}>{user.lastName}</Text>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>อีเมล:</Text>
        <Text style={styles.infoValue}>{user.email}</Text>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>สถานะ:</Text>
        <Text style={styles.infoValue}>{translateRole(user.role)}</Text>
      </View>

      {user.department && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>หน่วยงาน:</Text>
          <Text style={styles.infoValue}>{typeof user.department === 'object' ? user.department.name : user.department}</Text>
        </View>
      )}

      {user.faculty && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>คณะ:</Text>
          <Text style={styles.infoValue}>{typeof user.faculty === 'object' ? user.faculty.name : user.faculty}</Text>
        </View>
      )}

      {user.major && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>สาขา:</Text>
          <Text style={styles.infoValue}>{typeof user.major === 'object' ? user.major.name : user.major}</Text>
        </View>
      )}

      {user.groupCode && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>กลุ่มเรียน:</Text>
          <Text style={styles.infoValue}>{typeof user.groupCode === 'object' ? user.groupCode.name : user.groupCode}</Text>
        </View>
      )}

     

      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>วันที่สร้าง:</Text>
        <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
      </View>

      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>แก้ไขล่าสุด:</Text>
        <Text style={styles.infoValue}>{formatDate(user.updatedAt)}</Text>
      </View>

      {user.lastLogin && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>เข้าสู่ระบบล่าสุด:</Text>
          <Text style={styles.infoValue}>{formatDate(user.lastLogin)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  infoSection: {
    backgroundColor: '#fff',
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    width: 120,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
});

export default UserInfoSection;