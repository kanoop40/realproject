import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import MessageItem from '../../components/Message/MessageItem';
import FileAttachment from '../../components/Message/FileAttachment';
import { socket } from '../../utils/socket';

const ChatScreen = ({ route, navigation }) => {
  const { chatId, roomName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    // ตั้งค่าชื่อห้องแชทใน header
    navigation.setOptions({
      title: roomName,
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('ChatInfo', { chatId })}
          className="mr-4"
        >
          <Icon name="information-circle-outline" size={24} color="#000" />
        </TouchableOpacity>
      )
    });

    // โหลดข้อความเก่า
    loadMessages();

    // เข้าร่วมห้องแชท
    socket.emit('join_chat', chatId);

    // รับข้อความใหม่
    socket.on('new_message', handleNewMessage);
    
    // รับสถานะการพิมพ์
    socket.on('typing_status', handleTypingStatus);

    return () => {
      socket.off('new_message');
      socket.off('typing_status');
    };
  }, []);

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/messages/${chatId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const handleNewMessage = (message) => {
    setMessages(prev => [message, ...prev]);
  };

  const handleTypingStatus = ({ userId, isTyping }) => {
    if (userId !== user.id) {
      setIsTyping(isTyping);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    try {
      const response = await fetch(
        `${process.env.API_URL}/api/messages/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            chatId,
            content: inputMessage
          })
        }
      );

      if (response.ok) {
        setInputMessage('');
        socket.emit('send_message', {
          chatId,
          content: inputMessage
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleAttachment = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.images,
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx
        ]
      });

      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        type: result.type,
        name: result.name
      });
      formData.append('chatId', chatId);

      const response = await fetch(
        `${process.env.API_URL}/api/files/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        socket.emit('send_message', {
          chatId,
          content: 'Sent a file',
          fileId: data.file._id
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1">
        {isTyping && (
          <View className="p-2">
            <Text className="text-gray-500">กำลังพิมพ์...</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              isOwnMessage={item.user_id === user.id}
              onDelete={() => handleDeleteMessage(item._id)}
            />
          )}
        />

        <View className="border-t border-gray-200 p-2">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={handleAttachment}
              className="p-2"
            >
              <Icon name="attach" size={24} color="#666" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 mx-2"
              placeholder="พิมพ์ข้อความ..."
              value={inputMessage}
              onChangeText={text => {
                setInputMessage(text);
                socket.emit('typing', {
                  chatId,
                  isTyping: text.length > 0
                });
              }}
              multiline
            />

            <TouchableOpacity 
              onPress={handleSend}
              disabled={!inputMessage.trim()}
              className={`p-2 rounded-full ${
                inputMessage.trim() ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <Icon 
                name="send" 
                size={20} 
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;