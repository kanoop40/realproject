// ตัวอย่างการใช้งาน ChatHeader ที่อัปเดตแล้วใน PrivateChatScreen.js

import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { ChatHeader, MessageBubble, MessageInput } from '../components_user';

const PrivateChatScreen = ({ route, navigation }) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  // ... other states

  // ฟังก์ชันจัดการเมนู
  const handleManageChat = () => {
    console.log('🔄 เข้าสู่โหมดจัดการแชท');
    setSelectionMode(true);
    setSelectedMessages([]);
  };

  const handleClearChat = () => {
    Alert.alert(
      'ล้างประวัติแชท',
      'คุณต้องการลบข้อความทั้งหมดในแชทนี้หรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ลบทั้งหมด',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ ล้างประวัติแชททั้งหมด');
            // เรียก API ลบข้อความทั้งหมด
            // clearAllMessages();
          },
        },
      ]
    );
  };

  const handleBlockUser = () => {
    Alert.alert(
      'บล็อกผู้ใช้',
      `คุณต้องการบล็อก ${route.params?.recipientName} หรือไม่?`,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'บล็อก',
          style: 'destructive',
          onPress: () => {
            console.log('🚫 บล็อกผู้ใช้');
            // เรียก API บล็อกผู้ใช้
            // blockUser(route.params?.recipientId);
          },
        },
      ]
    );
  };

  const handleCancelSelection = () => {
    console.log('❌ ยกเลิกการเลือกข้อความ');
    setSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleDeleteSelected = () => {
    if (selectedMessages.length === 0) return;

    Alert.alert(
      'ลบข้อความ',
      `คุณต้องการลบข้อความที่เลือก ${selectedMessages.length} ข้อความหรือไม่?`,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ ลบข้อความที่เลือก:', selectedMessages);
            // เรียก API ลบข้อความที่เลือก
            // deleteSelectedMessages(selectedMessages);
            setSelectionMode(false);
            setSelectedMessages([]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header พร้อมเมนู dropdown */}
      <ChatHeader
        recipientName={route.params?.recipientName}
        recipientAvatar={route.params?.recipientAvatar}
        roomName={route.params?.roomName}
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
        onBackPress={() => navigation.goBack()}
        onCancelSelection={handleCancelSelection}
        onDeleteSelected={handleDeleteSelected}
        onManageChat={handleManageChat}
        onClearChat={handleClearChat}
        onBlockUser={handleBlockUser}
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