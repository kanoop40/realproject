import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import socket from '../api/socket';

const ChatRoomScreen = ({ route }) => {
  const { user } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    // สมมติ join room ตาม user.id
    socket.emit('joinRoom', user.id);

    socket.on('receiveMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('receiveMessage');
      socket.emit('leaveRoom', user.id);
    };
  }, [user.id]);

  const handleSend = () => {
    if (input.trim()) {
      const msgObj = {
        text: input,
        sender: 'me', // ใส่ id จริงของตัวเองถ้ามี
        time: new Date().toLocaleTimeString().slice(0,5),
      };
      socket.emit('sendMessage', { roomId: user.id, message: msgObj });
      setMessages((prev) => [...prev, msgObj]);
      setInput('');
      // scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msgBox, item.sender === 'me' ? styles.myMsg : styles.otherMsg]}>
      <Text style={styles.msgText}>{item.text}</Text>
      <Text style={styles.msgTime}>{item.time}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#e3f2fd' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>{user.name} ({user.id})</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, idx) => idx.toString()}
        style={{ flex: 1, padding: 12 }}
        contentContainerStyle={{ paddingBottom: 12 }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="พิมพ์ข้อความ..."
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>ส่ง</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: '#1976d2', padding: 16 },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  msgBox: { padding: 10, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  myMsg: { backgroundColor: '#b3e5fc', alignSelf: 'flex-end', },
  otherMsg: { backgroundColor: '#fff', alignSelf: 'flex-start', },
  msgText: { fontSize: 16 },
  msgTime: { fontSize: 11, color: '#607d8b', alignSelf: 'flex-end', marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e3f2fd' },
  input: { flex: 1, backgroundColor: '#e3f2fd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginRight: 8 },
  sendBtn: { backgroundColor: '#1976d2', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 8 },
});

export default ChatRoomScreen;