
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

const tabData = [
  {
    key: 'Chat',
    label: 'แชท',
    icon: 'chatbubbles-outline',
  },
  {
    key: 'Profile',
    label: 'โปรไฟล์',
    icon: 'person-outline',
  },
  {
    key: 'Search',
    label: 'ค้นหา',
    icon: 'search-outline',
  },
  {
    key: 'Settings',
    label: 'ตั้งค่า',
    icon: 'settings-outline',
  },
];

const TabBar = ({ navigation, activeTab }) => {
  const handleTabPress = (tabKey) => {
    if (tabKey === 'Chat') navigation.navigate('Chat');
    else if (tabKey === 'Profile') navigation.navigate('Profile');
    else if (tabKey === 'SearchUser') navigation.navigate('SearchUser');
    // 'Other' tab can be customized
  };

  return (
    <View style={styles.tabBarContainer}>
      {tabData.map(tab => (
                <TouchableOpacity
          key={item.key}
          style={[styles.tab, isActive && styles.activeTab]}
          onPress={() => handleTabPress(item.key)}
        >
          <Ionicons 
            name={item.icon} 
            size={24} 
            color={isActive ? '#007AFF' : '#8E8E93'} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, isActive && styles.activeText]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default TabBar;