import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Image } from 'react-native';
import { socketEvents } from '../../utils/socket';
import * as ImagePicker from 'expo-image-picker';

const MessageInput = ({ chatId, onSend }) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeout = useRef(null);

  const handleTyping = () => {
    socketEvents.startTyping(chatId);
    
    // Clear previous timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set new timeout
    typingTimeout.current = setTimeout(() => {
      socketEvents.stopTyping(chatId);
    }, 3000);
  };

  const handleSend = async () => {
    if (!message.trim() && !isUploading) return;

    try {
      await onSend(message);
      setMessage('');
      socketEvents.stopTyping(chatId);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleAttachment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setIsUploading(true);
        // Upload file logic here
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      setIsUploading(false);
    }
  };

  return (
    <View className="flex-row items-center p-2 bg-white border-t border-gray-200">
      <TouchableOpacity
        onPress={handleAttachment}
        className="p-2"
      >
        <Image
          source={require('../../assets/icons/attachment.png')}
          className="w-6 h-6"
        />
      </TouchableOpacity>
      
      <TextInput
        value={message}
        onChangeText={setMessage}
        onKeyPress={handleTyping}
        placeholder="พิมพ์ข้อความ..."
        multiline
        className="flex-1 min-h-[40px] max-h-[100px] px-4 py-2 mx-2 bg-gray-100 rounded-full"
      />
      
      <TouchableOpacity
        onPress={handleSend}
        disabled={!message.trim() && !isUploading}
        className={`p-2 rounded-full ${
          message.trim() || isUploading ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <Image
          source={require('../../assets/icons/send.png')}
          className="w-6 h-6 tint-white"
        />
      </TouchableOpacity>
    </View>
  );
};

export default MessageInput;