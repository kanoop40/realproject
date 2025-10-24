import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { API_URL } from '../service/api';
import { AvatarImage } from '../service/avatarUtils';

const UserActionsModal = ({ 
  visible, 
  selectedUser, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.userActionsOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.userActionsContainer}>
          <Text style={styles.userActionsTitle}>จัดการผู้ใช้</Text>
          
          {selectedUser && (
            <View style={styles.selectedUserInfo}>
              <AvatarImage 
                avatarPath={selectedUser.avatar} 
                name={selectedUser.firstName} 
                size={80} 
                style={styles.modalAvatar}
              />
              <Text style={styles.modalUserName}>
                {selectedUser.firstName} {selectedUser.lastName}
              </Text>
              <Text style={styles.modalUsername}>@{selectedUser.username}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.userActionItem}
            onPress={() => {
              onClose();
              onEdit(selectedUser);
            }}
          >
            <Text style={styles.userActionIcon}></Text>
            <Text style={styles.userActionText}>แก้ไขข้อมูล</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.userActionItem, styles.deleteUserAction]}
            onPress={() => {
              onClose();
              onDelete(selectedUser);
            }}
          >
            <Text style={styles.userActionIcon}></Text>
            <Text style={[styles.userActionText, styles.deleteUserActionText]}>ลบผู้ใช้</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.userActionItem, styles.cancelUserAction]}
            onPress={onClose}
          >
            <Text style={styles.userActionIcon}></Text>
            <Text style={styles.userActionText}>ยกเลิก</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  userActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userActionsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  userActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  selectedUserInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalUsername: {
    fontSize: 14,
    color: '#666',
  },
  userActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  userActionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  userActionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  deleteUserAction: {
    backgroundColor: '#ffebee',
  },
  deleteUserActionText: {
    color: '#d32f2f',
  },
  cancelUserAction: {
    backgroundColor: '#f5f5f5',
    marginTop: 8,
  },
});

export default UserActionsModal;