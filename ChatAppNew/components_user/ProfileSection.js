import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { API_URL } from '../service/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';
import { AvatarImage } from '../service/avatarUtils';

const ProfileSection = ({ 
  currentUser, 
  isUpdating, 
  onImagePickerPress, 
  translateRole 
}) => {
  return (
    <View style={styles.profileSection}>
      <TouchableOpacity 
        style={styles.avatarContainer}
        onPress={onImagePickerPress}
        disabled={isUpdating}
      >
        <AvatarImage 
          avatarPath={currentUser?.avatar} 
          name={currentUser?.firstName} 
          size={100} 
          style={styles.avatar}
        />
        
        <View style={styles.cameraIconContainer}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.cameraIcon}>📷</Text>
          )}
        </View>
      </TouchableOpacity>

      <Text style={styles.userName}>
        {currentUser?.firstName || ''} {currentUser?.lastName || ''}
      </Text>
      <Text style={styles.username}>{currentUser?.username || ''}</Text>
      <View style={styles.roleContainer}>
        <Text style={styles.verifiedIcon}></Text>
        <Text style={styles.roleText}>{translateRole(currentUser?.role)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileSection: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.backgroundTertiary,
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
    ...SHADOWS.md,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  username: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm + 2,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
  },
  roleText: {
    marginLeft: 5,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accent,
    fontWeight: '500',
  },
  cameraIcon: {
    fontSize: 16,
    color: '#fff'
  },
  verifiedIcon: {
    fontSize: 16,
    color: '#007AFF'
  },
});

export default ProfileSection;