import React from 'react';
import { View, Image } from 'react-native';
import { format } from 'date-fns';

const ReadReceipts = ({ message, currentUser }) => {
  const isMyMessage = message.user_id._id === currentUser._id;
  
  if (!isMyMessage) return null;

  const getReadStatus = () => {
    if (!message.readBy?.length) {
      return 'sent';
    }
    
    const allRead = message.readBy.length === message.chat_id.user_id.length - 1;
    return allRead ? 'read' : 'delivered';
  };

  const getStatusIcon = () => {
    switch (getReadStatus()) {
      case 'read':
        return require('../../assets/icons/read.png');
      case 'delivered':
        return require('../../assets/icons/delivered.png');
      default:
        return require('../../assets/icons/sent.png');
    }
  };

  const getReadByAvatars = () => {
    if (getReadStatus() !== 'read') return null;

    return message.readBy
      .slice(0, 3)
      .map(({ user, time }) => (
        <View key={user._id} className="relative">
          <Image
            source={{ uri: user.avatar }}
            className="w-4 h-4 rounded-full -ml-2 border border-white"
          />
          <View className="absolute -bottom-4">
            <Text className="text-xs text-gray-500">
              {format(new Date(time), 'HH:mm')}
            </Text>
          </View>
        </View>
      ));
  };

  return (
    <View className="flex-row items-center mt-1">
      <Image
        source={getStatusIcon()}
        className="w-4 h-4 tint-gray-600"
      />
      <View className="flex-row ml-2">
        {getReadByAvatars()}
      </View>
    </View>
  );
};

export default ReadReceipts;