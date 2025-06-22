import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const RetryBanner = ({ count, onRetry }) => {
  return (
    <View className="bg-yellow-100 px-4 py-2 flex-row justify-between items-center">
      <Text className="text-yellow-800">
        {count} ข้อความไม่สามารถส่งได้
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        className="bg-yellow-500 px-4 py-2 rounded"
      >
        <Text className="text-white">ลองใหม่</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RetryBanner;