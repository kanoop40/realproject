import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Alert 
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

// SPACING, RADIUS, SHADOWS are now imported from theme

const MessageInput = ({ 
  newMessage,
  setNewMessage,
  isSending,
  selectedFile,
  selectedImage,
  onSendMessage,
  onPickFile,
  onPickImage,
  onRemoveFile,
  onRemoveImage
}) => {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const handleAttachmentPress = () => {
    setShowAttachmentMenu(true);
  };

  const handleImagePick = async () => {
    setShowAttachmentMenu(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('ขออนุญาต', 'กรุณาอนุญาตให้เข้าถึงคลังภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onPickImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const handleFilePick = async () => {
    setShowAttachmentMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onPickFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกไฟล์ได้');
    }
  };

  const handleSend = () => {
    if (newMessage.trim() || selectedFile || selectedImage) {
      onSendMessage();
    }
  };

  return (
    <>
      <View style={styles.inputContainer}>
        {/* แสดงไฟล์ที่เลือก */}
        {selectedFile && (
          <View style={styles.selectedFileContainer}>
            <Text style={styles.selectedFileText}>
              📎 {selectedFile.name || selectedFile.fileName || 'ไฟล์ที่เลือก'}
            </Text>
            <TouchableOpacity onPress={onRemoveFile} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* แสดงรูปภาพที่เลือก */}
        {selectedImage && (
          <View style={styles.selectedFileContainer}>
            <Text style={styles.selectedFileText}>
              🖼️ รูปภาพที่เลือก
            </Text>
            <TouchableOpacity onPress={onRemoveImage} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          {/* ปุ่มแนบไฟล์ */}
          <TouchableOpacity
            onPress={handleAttachmentPress}
            style={styles.attachmentButton}
          >
            <Text style={styles.attachmentButtonText}>📎</Text>
          </TouchableOpacity>

          {/* ช่องพิมพ์ข้อความ */}
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={1000}
            editable={!isSending}
          />

          {/* ปุ่มส่ง */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={isSending || (!newMessage.trim() && !selectedFile && !selectedImage)}
            style={[
              styles.sendButton,
              (isSending || (!newMessage.trim() && !selectedFile && !selectedImage)) && styles.sendButtonDisabled
            ]}
          >
            <Text style={[
              styles.sendButtonText,
              (isSending || (!newMessage.trim() && !selectedFile && !selectedImage)) && styles.sendButtonTextDisabled
            ]}>
              {isSending ? '⏳' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal แนบไฟล์ */}
      <Modal
        visible={showAttachmentMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View style={styles.attachmentMenu}>
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={handleImagePick}
            >
              <Text style={styles.attachmentMenuIcon}>🖼️</Text>
              <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={handleFilePick}
            >
              <Text style={styles.attachmentMenuIcon}>📎</Text>
              <Text style={styles.attachmentMenuText}>ไฟล์</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  selectedFileText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  removeButton: {
    paddingHorizontal: SPACING.sm,
  },
  removeButtonText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachmentButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentButtonText: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  sendButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  sendButtonText: {
    fontSize: 18,
    color: COLORS.textInverse,
    fontWeight: 'bold',
  },
  sendButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  attachmentMenu: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.lg,
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.xs,
  },
  attachmentMenuIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  attachmentMenuText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});

export default MessageInput;