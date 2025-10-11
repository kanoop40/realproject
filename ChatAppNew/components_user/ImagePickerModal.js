import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const ImagePickerModal = ({
  visible,
  onTakePhoto,
  onSelectFromLibrary,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.imagePickerOverlay}>
        <View style={styles.imagePickerContainer}>
          <Text style={styles.imagePickerTitle}>เลือกรูปโปรไฟล์</Text>
          
          <TouchableOpacity 
            style={styles.imagePickerOption}
            onPress={onTakePhoto}
          >
            <Text style={styles.cameraPickerIcon}>📷</Text>
            <Text style={styles.imagePickerOptionText}>ถ่ายภาพ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.imagePickerOption}
            onPress={onSelectFromLibrary}
          >
            <Text style={styles.libraryIcon}>🖼️</Text>
            <Text style={styles.imagePickerOptionText}>เลือกจากแกลเลอรี่</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.imagePickerCancel}
            onPress={onClose}
          >
            <Text style={styles.imagePickerCancelText}>ยกเลิก</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  imagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imagePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  imagePickerOptionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  imagePickerCancel: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  imagePickerCancelText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '500',
  },
  cameraPickerIcon: {
    fontSize: 24,
    color: '#007AFF'
  },
  libraryIcon: {
    fontSize: 24,
    color: '#007AFF'
  },
});

export default ImagePickerModal;