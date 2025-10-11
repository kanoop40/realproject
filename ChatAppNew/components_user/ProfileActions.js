import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

const ProfileActions = ({ 
  onEditProfile, 
  onChangePassword, 
  onLogout 
}) => {
  return (
    <View style={styles.actionsSection}>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={onEditProfile}
      >
        <Text style={styles.actionIcon}>✏️</Text>
        <Text style={styles.actionButtonText}>แก้ไขข้อมูล</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={onChangePassword}
      >
        <Text style={styles.actionIcon}>🔒</Text>
        <Text style={styles.actionButtonText}>เปลี่ยนรหัสผ่าน</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.logoutActionButton]} 
        onPress={onLogout}
      >
        <Text style={styles.actionIcon}>🚪</Text>
        <Text style={[styles.actionButtonText, styles.logoutActionText]}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm + 4,
    width: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  logoutActionButton: {
    backgroundColor: '#ffebee',
    borderColor: COLORS.error,
  },
  actionIcon: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginRight: SPACING.sm,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: '#333',
    fontWeight: '500',
  },
  logoutActionText: {
    color: '#d32f2f',
  },
});

export default ProfileActions;