import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
  Keyboard
} from 'react-native';

const MessageInput = ({ 
  chatId, 
  onSend,
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputHeight = useRef(new Animated.Value(40)).current;
  const attachmentScale = useRef(new Animated.Value(1)).current;

  const handleContentSizeChange = (event) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), 100);
    
    Animated.spring(inputHeight, {
      toValue: newHeight,
      useNativeDriver: false,
      bounciness: 0
    }).start();
  };

  const animateAttachment = () => {
    Animated.sequence([
      Animated.timing(attachmentScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(attachmentScale, {
        toValue: 1,
        bounciness: 12,
        useNativeDriver: true
      })
    ]).start();
  };

  return (
    <View className="bg-white border-t border-gray-200 px-4 py-2">
      <View className="flex-row items-end">
        <Animated.View
          style={{ transform: [{ scale: attachmentScale }] }}
        >
          <TouchableOpacity
            onPress={() => {
              animateAttachment();
              // Handle attachment
            }}
            disabled={disabled}
            className="p-2"
          >
            <Image
              source={require('../../assets/icons/attachment.png')}
              className={`w-6 h-6 ${disabled ? 'opacity-50' : ''}`}
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          className="flex-1 mx-2"
          style={{ height: inputHeight }}
        >
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="พิมพ์ข้อความ..."
            multiline
            onContentSizeChange={handleContentSizeChange}
            editable={!disabled}
            className={`
              flex-1 px-4 py-2 bg-gray-100 rounded-full
              ${disabled ? 'opacity-50' : ''}
            `}
          />
        </Animated.View>

        <TouchableOpacity
          onPress={() => {
            if (message.trim()) {
              onSend(message);
              setMessage('');
              Keyboard.dismiss();
            }
          }}
          disabled={!message.trim() || disabled}
          className={`
            p-2 rounded-full
            ${message.trim() ? 'bg-blue-500' : 'bg-gray-300'}
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          <Image
            source={require('../../assets/icons/send.png')}
            className="w-6 h-6 tint-white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageInput;