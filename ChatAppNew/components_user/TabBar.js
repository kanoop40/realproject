
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
            <Ionicons 
              name={tab.icon} 
              size={24} 
              color={isActive ? '#007AFF' : '#8E8E93'} 
              style={styles.tabIcon}
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
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  activeTab: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
  },
  activeText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default TabBar;