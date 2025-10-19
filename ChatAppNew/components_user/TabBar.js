
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { COLORS } from '../styles/theme';

const tabData = [
  {
    key: 'Chat',
    label: 'แชท',
    icon: 'chatbubbles-outline',
    animation: require('../assets/Chat Bubbles.json'),
  },
  {
    key: 'Profile',
    label: 'โปรไฟล์',
    icon: 'person-outline',
    animation: require('../assets/Person - profile.json'),
  },
  {
    key: 'Search',
    label: 'ค้นหา',
    icon: 'search-outline',
    animation: require('../assets/Interactive Animation _ Search bar _ Menu Buttons.json'),
  },
];

const TabBar = ({ navigation, activeTab }) => {
  const handleTabPress = (tabKey) => {
    if (tabKey === 'Chat') navigation.navigate('Chat');
    else if (tabKey === 'Profile') navigation.navigate('Profile');
    else if (tabKey === 'Search') navigation.navigate('SearchUser');
  };

  return (
    <View style={styles.tabBarContainer}>
      {tabData.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, isActive && styles.activeTab]}
            onPress={() => handleTabPress(tab.key)}
          >
            <LottieView
              source={tab.animation}
              autoPlay={isActive}
              loop={isActive}
              style={styles.tabAnimation}
            />
            <Text style={[styles.tabLabel, isActive && styles.activeText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // ใช้สีขาวล้วนๆ
    borderTopWidth: Platform.OS === 'android' ? 0 : 1, // ลบ border บน Android
    borderTopColor: Platform.OS === 'android' ? 'transparent' : COLORS.border,
    paddingVertical: Platform.OS === 'android' ? 16 : 12, // เพิ่ม padding สำหรับ Android
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'android' ? 20 : 12, // เพิ่ม bottom padding สำหรับ Android
    elevation: Platform.OS === 'android' ? 12 : 0, // เพิ่ม elevation สำหรับ Android
    shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
    shadowOffset: Platform.OS === 'ios' ? {
      width: 0,
      height: -2,
    } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
    shadowRadius: Platform.OS === 'ios' ? 3 : 0,
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 10 : 8,
    paddingHorizontal: 12,
    minHeight: Platform.OS === 'android' ? 60 : 50, // ความสูงขั้นต่ำสำหรับ Android
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabAnimation: {
    width: Platform.OS === 'android' ? 32 : 30,
    height: Platform.OS === 'android' ? 32 : 30,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#666666', // สีเทาสำหรับ inactive
    fontWeight: '500',
  },
  activeTab: {
    backgroundColor: 'rgba(229, 182, 28, 0.1)', // สีเหลืองอ่อนสำหรับ active
    borderRadius: 8,
  },
  activeText: {
    color: '#e5b61c', // สีเหลืองสำหรับ active text
    fontWeight: '600',
  },
});

export default TabBar;