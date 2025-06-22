import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import OnlineStatus from '../User/OnlineStatus';

const ChatHeader = ({ title, onBack, online, typing, members }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const expandAnim = React.useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false
    }).start();
    setIsExpanded(!isExpanded);
  };

  const containerHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 120]
  });

  return (
    <Animated.View 
      className="bg-white border-b border-gray-200"
      style={{ height: containerHeight }}
    >
      <View className="flex-row items-center px-4 h-[60px]">
        <TouchableOpacity
          onPress={onBack}
          className="p-2 -ml-2"
        >
          <Image
            source={require('../../assets/icons/back.png')}
            className="w-6 h-6"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={toggleExpand}
          className="flex-1 ml-2"
        >
          <Text className="text-lg font-semibold">
            {title}
          </Text>
          <View className="flex-row items-center">
            <OnlineStatus status={online ? 'online' : 'offline'} />
            {typing && (
              <Text className="text-sm text-gray-500 ml-2">
                กำลังพิมพ์...
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View className="flex-row">
          <TouchableOpacity className="p-2">
            <Image
              source={require('../../assets/icons/call.png')}
              className="w-6 h-6"
            />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Image
              source={require('../../assets/icons/more.png')}
              className="w-6 h-6"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View 
        className="px-4"
        style={{ opacity: expandAnim }}
      >
        <View className="flex-row flex-wrap">
          {members?.map(member => (
            <View 
              key={member._id}
              className="flex-row items-center mr-4 mb-2"
            >
              <Image
                source={{ uri: member.avatar }}
                className="w-6 h-6 rounded-full"
              />
              <Text className="text-sm text-gray-600 ml-1">
                {member.firstName}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default ChatHeader;