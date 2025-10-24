import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../styles/theme';

const ChatInputBar = ({
  newMessage,
  setNewMessage,
  selectedFile,
  selectedImage,
  isSending,
  showAttachmentMenu,
  setShowAttachmentMenu,
  onSendMessage,
  onPickImage,
  onPickFile,
  onRemoveFile,
  getFileIcon
}) => {
  return (
    <View style={styles.inputContainer}>
      {/* แสดงไฟล์/รูปภาพที่เลือก แบบ Telegram */}
      {selectedFile && (
        <View style={styles.selectedFileContainer}>
          <View style={styles.selectedFileContent}>
            <View style={styles.selectedFileRow}>
              <View style={styles.fileIconContainer}>
                {getFileIcon(selectedFile.name || selectedFile.fileName)}
              </View>
              <View style={styles.fileInfoContainer}>
                <Text style={styles.fileTitle}>
                  📎 ไฟล์แนบ
                </Text>
                <Text style={styles.fileSubtitle} numberOfLines={1}>
                  {selectedFile.name || selectedFile.fileName || 'ไฟล์ที่เลือก'} • {selectedFile.size ? Math.round(selectedFile.size / 1024) + ' KB' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeFileButton}
              onPress={onRemoveFile}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.removeFileText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Attachment Menu - Vertical Style */}
      {showAttachmentMenu && (
        <View style={styles.verticalAttachmentMenu}>
          <TouchableOpacity
            style={styles.verticalAttachmentItem}
            onPress={() => {
              onPickImage();
              setShowAttachmentMenu(false);
            }}
          >
            <Text style={styles.attachmentIcon}>IMG</Text>
            <Text style={styles.attachmentMenuText}>รูปภาพ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.verticalAttachmentItem}
            onPress={() => {
              onPickFile();
              setShowAttachmentMenu(false);
            }}
          >
            <Text style={[styles.attachmentIcon, { color: "#3b82f6" }]}>FILE</Text>
            <Text style={styles.attachmentMenuText}>ไฟล์</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.messageInputRow}>
        <TouchableOpacity
          style={styles.leftAttachmentButton}
          onPress={() => {
            console.log('📎 Plus button pressed');
            setShowAttachmentMenu(!showAttachmentMenu);
          }}
        >
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="พิมพ์ข้อความ..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          keyboardType="default"
          returnKeyType="default"
          autoCorrect={true}
          spellCheck={true}
          autoCapitalize="sentences"
        />
        
        <TouchableOpacity
          style={styles.floatingSendButton}
          onPress={onSendMessage}
          disabled={(!newMessage.trim() && !selectedFile && !selectedImage) || isSending}
        >
          <Text style={styles.sendButtonText}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: SPACING.xs,
  },
  selectedFileContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    ...SHADOWS.small
  },
  selectedFileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  fileIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  fileInfoContainer: {
    flex: 1
  },
  fileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2
  },
  fileSubtitle: {
    fontSize: 14,
    color: '#64748b'
  },
  removeFileButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  removeFileText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    lineHeight: 18
  },
  verticalAttachmentMenu: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120
  },
  verticalAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  attachmentIcon: {
    fontSize: 16,
    color: "#10b981",
    fontWeight: 'bold',
    marginRight: 12,
    width: 35
  },
  attachmentMenuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs
  },
  leftAttachmentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  plusButtonText: {
    fontSize: 28,
    color: "#007AFF",
    fontWeight: 'bold'
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: 'white',
    borderRadius: 22,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlignVertical: 'center'
  },
  floatingSendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 22,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  }
});

export default ChatInputBar;