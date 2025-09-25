import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../service/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const ChangePasswordScreen = ({ navigation }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsUpdating(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await api.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('✅ Password changed successfully');

      Alert.alert(
        'สำเร็จ',
        'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
        [
          {
            text: 'ตกลง',
            onPress: () => navigation.goBack()
          }
        ]
      );

      // รีเซ็ตฟอร์ม
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (error) {
      console.error('❌ Error changing password:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
      
      Alert.alert('ข้อผิดพลาด', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เปลี่ยนรหัสผ่าน</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>เปลี่ยนรหัสผ่าน</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>รหัสผ่านปัจจุบัน *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                placeholder="กรอกรหัสผ่านปัจจุบัน"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPasswords.current}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility('current')}
              >
                <Text style={styles.eyeIcon}>{showPasswords.current ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>รหัสผ่านใหม่ *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPasswords.new}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility('new')}
              >
                <Text style={styles.eyeIcon}>{showPasswords.new ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ยืนยันรหัสผ่านใหม่ *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPasswords.confirm}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => togglePasswordVisibility('confirm')}
              >
                <Text style={styles.eyeIcon}>{showPasswords.confirm ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 รหัสผ่านใหม่ควรมีความปลอดภัยสูง ประกอบด้วยตัวอักษรและตัวเลข อย่างน้อย 6 ตัวอักษร
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>เปลี่ยนรหัสผ่าน</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSecondary,
    ...SHADOWS.sm,
  },
  backIcon: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  formSection: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    padding: SPACING.sm,
  },
  eyeIcon: {
    fontSize: 18,
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  bottomSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;