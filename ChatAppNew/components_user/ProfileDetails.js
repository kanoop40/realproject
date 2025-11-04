import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';

const ProfileDetails = ({ currentUser }) => {
  return (
    <View style={styles.detailsSection}>
      <View style={styles.detailItem}>
        <Text style={styles.emailIcon}></Text>
        <Text style={styles.detailLabel}>อีเมล</Text>
        <Text style={styles.detailValue}>{currentUser?.email || ''}</Text>
      </View>

      {currentUser?.faculty && (
        <View style={styles.detailItem}>
          <Text style={styles.schoolIcon}></Text>
          <Text style={styles.detailLabel}>คณะ</Text>
          <Text style={styles.detailValue}>
            {typeof currentUser.faculty === 'object' ? currentUser.faculty.name : currentUser.faculty}
          </Text>
        </View>
      )}

      {currentUser?.major && (
        <View style={styles.detailItem}>
          <Text style={styles.bookIcon}></Text>
          <Text style={styles.detailLabel}>สาขา</Text>
          <Text style={styles.detailValue}>
            {typeof currentUser.major === 'object' ? currentUser.major.name : currentUser.major}
          </Text>
        </View>
      )}

      {currentUser?.groupCode && currentUser?.role !== 'teacher' && (
        <View style={styles.detailItem}>
          <Text style={styles.groupIcon}></Text>
          <Text style={styles.detailLabel}>รหัสกลุ่ม</Text>
          <Text style={styles.detailValue}>
            {typeof currentUser.groupCode === 'object' ? currentUser.groupCode.name : currentUser.groupCode}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  detailsSection: {
    backgroundColor: COLORS.background,
    marginTop: SPACING.sm + 2,
    paddingVertical: SPACING.sm + 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emailIcon: {
    fontSize: 20,
    color: '#666'
  },
  schoolIcon: {
    fontSize: 20,
    color: '#666'
  },
  bookIcon: {
    fontSize: 20,
    color: '#666'
  },
  groupIcon: {
    fontSize: 20,
    color: '#666'
  },
});

export default ProfileDetails;