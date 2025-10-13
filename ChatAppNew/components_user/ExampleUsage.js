// ตัวอย่างการใช้งานใน PrivateChatScreen.js

import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { MessageBubble, ChatHeader, MessageInput } from '../components_user';

const PrivateChatScreen = ({ route, navigation }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  // ... other states

  const handleMessagePress = (item) => {
    // จัดการเมื่อกดข้อความ
  };

  const handleSendMessage = () => {
    // จัดการส่งข้อความ
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <ChatHeader
        recipientName={route.params?.recipientName}
        recipientAvatar={route.params?.recipientAvatar}
        roomName={route.params?.roomName}
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
        onBackPress={() => navigation.goBack()}
        onCancelSelection={() => {
          setSelectionMode(false);
          setSelectedMessages([]);
        }}
        onDeleteSelected={() => {/* จัดการลบข้อความ */}}
      />

      {/* Message List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            currentUser={currentUser}
            recipientName={route.params?.recipientName}
            recipientAvatar={route.params?.recipientAvatar}
            selectionMode={selectionMode}
            selectedMessages={selectedMessages}
            showTimeForMessages={showTimeForMessages}
            onMessagePress={handleMessagePress}
            onLongPress={() => {/* จัดการกดค้าง */}}
            formatDateTime={formatDateTime}
          />
        )}
      />

      {/* Message Input */}
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        isSending={isSending}
        selectedFile={selectedFile}
        selectedImage={selectedImage}
        onSendMessage={handleSendMessage}
        onPickFile={(file) => setSelectedFile(file)}
        onPickImage={(image) => setSelectedImage(image)}
        onRemoveFile={() => setSelectedFile(null)}
        onRemoveImage={() => setSelectedImage(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default PrivateChatScreen;