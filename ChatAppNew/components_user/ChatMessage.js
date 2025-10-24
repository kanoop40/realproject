import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet
} from 'react-native';
import ImageMessage from './ImageMessage';
import FileMessage from './FileMessage';
import TextMessage from './TextMessage';
import { API_URL } from '../service/api';
import { AvatarImage } from '../utils/avatarUtils';

const ChatMessage = ({ 
  item, 
  index, 
  currentUser, 
  recipientAvatar, 
  recipientName, 
  showTimeForMessages,
  timeAnimations,
  selectionMode, 
  selectedMessages,
  onMessagePress,
  onLongPress,
  onImagePress,
  onFilePress,
  formatDateTime,
  shouldShowTime,
  getFileIcon,
  decodeFileName,
  formatFileSize
}) => {
  // Fallback system working correctly
  
  // Handle both object and string sender formats with null safety
  const isMyMessage = (
    (item.sender && typeof item.sender === 'object' && item.sender?._id === currentUser._id) ||
    (item.sender && typeof item.sender === 'string' && (
      item.sender === currentUser?.firstName ||
      item.sender === currentUser?.firstName?.split(' ')[0] ||
      currentUser?.firstName?.startsWith(item.sender) ||
      (item.sender && item.sender.includes && item.sender.includes(currentUser?.firstName?.split(' ')[0] || ''))
    ))
  );

  const handleDeleteMessageConfirm = () => {
    // Logic for delete confirmation
    if (onLongPress) onLongPress();
  };

  const handleMessagePress = () => {
    onMessagePress(item);
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}
    >
      {/* Selection indicator */}
      {selectionMode && selectedMessages.includes(item._id) && (
        <View 
          pointerEvents="none"
          style={[
            styles.selectionIndicator,
            {
              right: isMyMessage ? 10 : 'auto',
              left: isMyMessage ? 'auto' : 50,
            }
          ]}
        >
          <Text style={styles.selectionCheckmark}>✓</Text>
        </View>
      )}

      {/* Avatar for other messages */}
      {!isMyMessage && (
        <View style={styles.messageAvatarContainer}>
          <AvatarImage 
            avatar={recipientAvatar} 
            name={recipientName} 
            size={30} 
            style={styles.messageAvatar}
          />
        </View>
      )}
      
      <View style={[
        styles.messageContentContainer,
        isMyMessage ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
      ]}>
        {/* Image messages - check for actual image data first, then fallback */}
        {(
          item.messageType === 'image' || 
          item.image || 
          (item.file && item.file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name)) || 
          (item.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName)) || 
          (item.content === 'รูปภาพ' && item.messageType === 'text' && !item.image && !item.file && !item.fileName)
        ) && (
          <ImageMessage
            item={item}
            index={index}
            currentUser={currentUser}
            showTimeForMessages={showTimeForMessages}
            timeAnimations={timeAnimations}
            selectedMessages={selectedMessages}
            selectionMode={selectionMode}
            onImagePress={selectionMode ? null : onImagePress}
            onMessagePress={onMessagePress}
            onLongPress={onLongPress}
            formatDateTime={formatDateTime}
            shouldShowTime={shouldShowTime}
          />
        )}

        {/* Text messages */}
        {item.content && item.content !== 'รูปภาพ' && item.content !== 'ไฟล์แนบ' && (
          <TextMessage
            item={item}
            index={index}
            currentUser={currentUser}
            showTimeForMessages={showTimeForMessages}
            timeAnimations={timeAnimations}
            selectedMessages={selectedMessages}
            selectionMode={selectionMode}
            formatDateTime={formatDateTime}
            shouldShowTime={shouldShowTime}
            onMessagePress={onMessagePress}
            onLongPress={onLongPress}
          />
        )}

        {/* File messages (non-images) - check for actual file data first, then fallback */}
        {(
          item.messageType === 'file' || 
          (item.fileName && !(item.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName))) || 
          (item.file && !(item.file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.file_name))) || 
          (item.content === 'ไฟล์แนบ' && item.messageType === 'text' && !item.file && !item.fileName)
        ) && !(
          item.messageType === 'image' || 
          item.image || 
          (item.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileName)) || 
          (item.content === 'รูปภาพ' && item.messageType === 'text')
        ) && (
          <FileMessage
            item={item}
            index={index}
            currentUser={currentUser}
            showTimeForMessages={showTimeForMessages}
            timeAnimations={timeAnimations}
            selectedMessages={selectedMessages}
            selectionMode={selectionMode}
            onFilePress={selectionMode ? null : onFilePress}
            onMessagePress={onMessagePress}
            onLongPress={onLongPress}
            formatDateTime={formatDateTime}
            shouldShowTime={shouldShowTime}
            getFileIcon={getFileIcon}
            decodeFileName={decodeFileName}
            formatFileSize={formatFileSize}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 8
  },
  myMessage: {
    justifyContent: 'flex-end',
   
  },
  otherMessage: {
    justifyContent: 'flex-start'
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffffff',
    backgroundColor: '#777777ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  selectionCheckmark: {
    color: '#ffffffff', 
    fontSize: 14, 
    fontWeight: 'bold'
  },
  messageAvatarContainer: {
    marginRight: 8
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  defaultMessageAvatar: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280'
  },
  messageContentContainer: {
    flex: 1,
    maxWidth: '80%',
  },
});

export default React.memo(ChatMessage);