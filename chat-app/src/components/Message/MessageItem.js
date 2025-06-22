import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FileAttachment from './FileAttachment';

const MessageItem = ({ message, isOwnMessage, onDelete }) => {
  const formattedTime = new Date(message.time).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <View
      className={`p-2 max-w-[80%] ${
        isOwnMessage ? 'self-end' : 'self-start'
      }`}
    >
      <View
        className={`rounded-lg p-3 ${
          isOwnMessage ? 'bg-blue-500' : 'bg-gray-200'
        }`}
      >
        {message.file_id && (
          <FileAttachment file={message.file_id} />
        )}

        <Text
          className={
            isOwnMessage ? 'text-white' : 'text-black'
          }
        >
          {message.content}
        </Text>

        <View className="flex-row items-center justify-end mt-1">
          <Text
            className={`text-xs ${
              isOwnMessage ? 'text-white/70' : 'text-gray-500'
            }`}
          >
            {formattedTime}
          </Text>
        </View>
      </View>

      {isOwnMessage && (
        <TouchableOpacity
          onPress={onDelete}
          className="absolute top-0 right-0 -mr-6"
        >
          <Icon name="trash-outline" size={16} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MessageItem;