import React from 'react';
import { View } from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

const OnlineStatus = ({ status, lastSeen }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLastSeenText = () => {
    if (status === 'online') return 'ออนไลน์';
    if (!lastSeen) return 'ไม่พบข้อมูล';

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    
    if (now.getDate() === lastSeenDate.getDate()) {
      return `ออนไลน์ล่าสุด ${format(lastSeenDate, 'HH:mm')}`;
    }
    
    return `ออนไลน์ล่าสุด ${formatDistanceToNow(lastSeenDate, { 
      locale: th,
      addSuffix: true 
    })}`;
  };

  return (
    <View className="flex-row items-center">
      <View className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} mr-2`} />
      <Text className="text-sm text-gray-600">{getLastSeenText()}</Text>
    </View>
  );
};

export default OnlineStatus;