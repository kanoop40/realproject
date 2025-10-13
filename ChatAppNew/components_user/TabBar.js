import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../styles/theme';

const TabBar = ({ 
  navigation,
  handleLogout 
}) => {
  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateTochat= () => {
    navigation.navigate('Chat');
  };

  const navigateToSearch = () => {
    navigation.navigate('SearchUser');
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ออกจากระบบ', style: 'destructive', onPress: handleLogout }
      ]
    );
  };

  return (
    <View style={styles.tabBarContainer}>


      <TouchableOpacity 
        style={styles.tabItem}
        onPress={navigateToSearch}
      >
        <Text style={styles.tabIcon}></Text>
        <Text style={styles.tabLabel}>ค้นหา</Text>
      </TouchableOpacity>


      <TouchableOpacity 
        style={styles.tabItem}
        onPress={navigateTochat}
      >
        <Text style={styles.tabIcon}></Text>
        <Text style={styles.tabLabel}>แชท</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={navigateToProfile}
      >
        <Text style={styles.tabIcon}></Text>
        <Text style={styles.tabLabel}>โปรไฟล์</Text>
      </TouchableOpacity>
      
      
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={handleLogoutPress}
      >
        <Text style={[styles.tabIcon, styles.logoutIcon]}></Text>
        <Text style={[styles.tabLabel, styles.logoutLabel]}>ออกจากระบบ</Text>
      </TouchableOpacity>
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
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  logoutIcon: {
    color: '#ff3b30',
  },
  logoutLabel: {
    color: '#ff3b30',
  },
});

export default TabBar;