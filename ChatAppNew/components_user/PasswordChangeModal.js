import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

const PasswordChangeModal = ({
  visible,
  passwordForm,
  setPasswordForm,
  isUpdating,
  onChangePassword,
  onClose,
}) => {
  const handleClose = () => {
    onClose();
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.passwordModalOverlay}>
        <View style={styles.passwordModalContainer}>
          <Text style={styles.passwordModalTitle}>เปลี่ยนรหัสผ่าน</Text>
          
          <View style={styles.passwordInputGroup}>
            <Text style={styles.passwordInputLabel}>รหัสผ่านปัจจุบัน</Text>
            <TextInput
              style={styles.passwordInput}
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
              placeholder="กรุณากรอกรหัสผ่านปัจจุบัน"
              secureTextEntry={true}
            />
          </View>

          <View style={styles.passwordInputGroup}>
            <Text style={styles.passwordInputLabel}>รหัสผ่านใหม่</Text>
            <TextInput
              style={styles.passwordInput}
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
              placeholder="กรุณากรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              secureTextEntry={true}
            />
          </View>

          <View style={styles.passwordInputGroup}>
            <Text style={styles.passwordInputLabel}>ยืนยันรหัสผ่านใหม่</Text>
            <TextInput
              style={styles.passwordInput}
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
              placeholder="กรุณากรอกรหัสผ่านใหม่อีกครั้ง"
              secureTextEntry={true}
            />
          </View>

          <View style={styles.passwordModalActions}>
            <TouchableOpacity 
              style={styles.passwordCancelButton}
              onPress={handleClose}
            >
              <Text style={styles.passwordCancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.passwordSaveButton, isUpdating && styles.passwordSaveButtonDisabled]}
              onPress={onChangePassword}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.passwordSaveButtonText}>เปลี่ยนรหัสผ่าน</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordModalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordInputGroup: {
    marginBottom: 15,
  },
  passwordInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  passwordCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  passwordCancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  passwordSaveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  passwordSaveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  passwordSaveButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PasswordChangeModal;