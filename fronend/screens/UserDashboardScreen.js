
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const UserDashboardScreen = ({ navigation }) => {
  const [userInfo] = useState({
    name: 'สมชาย ใจดี',
    role: 'นักเรียน',
    id: 'ST001',
    class: 'ม.6/1',
  });

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ออกจากระบบ', 
          onPress: () => navigation.replace('Welcome')
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Icon name="account-circle" size={80} color="#FFD700" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userRole}>{userInfo.role}</Text>
              <Text style={styles.userId}>รหัส: {userInfo.id}</Text>
              {userInfo.class && (
                <Text style={styles.userClass}>ชั้น: {userInfo.class}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>เมนูหลัก</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Icon name="assignment" size={40} color="#2196F3" />
              <Text style={styles.actionText}>งานที่ได้รับ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="grade" size={40} color="#4CAF50" />
              <Text style={styles.actionText}>คะแนน</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="schedule" size={40} color="#FF9800" />
              <Text style={styles.actionText}>ตารางเรียน</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="announcement" size={40} color="#9C27B0" />
              <Text style={styles.actionText}>ประกาศ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="message" size={40} color="#FF5722" />
              <Text style={styles.actionText}>ข้อความ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="person" size={40} color="#607D8B" />
              <Text style={styles.actionText}>โปรไฟล์</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>กิจกรรมล่าสุด</Text>
          
          <View style={styles.activityItem}>
            <Icon name="assignment-turned-in" size={24} color="#4CAF50" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>ส่งงานคณิตศาสตร์</Text>
              <Text style={styles.activityTime}>2 ชั่วโมงที่แล้ว</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <Icon name="grade" size={24} color="#2196F3" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>ได้รับคะแนนวิทยาศาสตร์</Text>
              <Text style={styles.activityTime}>1 วันที่แล้ว</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <Icon name="announcement" size={24} color="#FF9800" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>ประกาศใหม่จากครู</Text>
              <Text style={styles.activityTime}>2 วันที่แล้ว</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  userId: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  userClass: {
    fontSize: 14,
    color: '#999',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  recentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityContent: {
    flex: 1,
    marginLeft: 15,
  },
  activityTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default UserDashboardScreen;