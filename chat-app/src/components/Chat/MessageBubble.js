import React, { useEffect } from 'react';
import { Animated, Pressable, Image } from 'react-native';
import { useAnimations } from '../../hooks/useAnimations';
import ReadReceipts from './ReadReceipts';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const MessageBubble = ({ 
  message, 
  onRetry, 
  onLongPress,
  isLastInGroup 
}) => {
  const { messageAnimation, animateMessage } = useAnimations();
  const isMyMessage = message.user_id._id === 'kanoop40'; // Use current user from context

  useEffect(() => {
    if (message.sending) {
      animateMessage();
    }
  }, [message.sending]);

  const getBubbleStyle = () => {
    const baseStyle = "px-4 py-2 max-w-[80%] rounded-2xl";
    const alignment = isMyMessage ? "ml-auto" : "mr-auto";
    const colorStyle = isMyMessage 
      ? "bg-blue-500" 
      : "bg-gray-100";
    const marginStyle = isLastInGroup
      ? "mb-4"
      : "mb-1";

    return `${baseStyle} ${alignment} ${colorStyle} ${marginStyle}`;
  };

  const renderContent = () => {
    if (message.file_id) {
      return (
        <>
          <Image
            source={{ uri: message.file_id.url }}
            className="w-48 h-48 rounded-lg mb-2"
            resizeMode="cover"
          />
          {message.content && (
            <Text className={`${isMyMessage ? 'text-white' : 'text-gray-800'}`}>
              {message.content}
            </Text>
          )}
        </>
      );
    }

    return (
      <Text 
        className={`${isMyMessage ? 'text-white' : 'text-gray-800'} text-base`}
        style={{ lineHeight: 20 }}
      >
        {message.content}
      </Text>
    );
  };

  const renderStatus = () => {
    if (message.failed) {
      return (
        <Pressable
          onPress={onRetry}
          className="flex-row items-center mt-1"
        >
          <Image
            source={require('../../assets/icons/error.png')}
            className="w-4 h-4 tint-red-500"
          />
          <Text className="text-xs text-red-500 ml-1">
            ส่งไม่สำเร็จ - แตะเพื่อลองใหม่
          </Text>
        </Pressable>
      );
    }

    if (message.sending) {
      return (
        <View className="flex-row items-center mt-1">
          <ActivityIndicator size="small" color="#9CA3AF" />
          <Text className="text-xs text-gray-500 ml-1">
            กำลังส่ง...
          </Text>
        </View>
      );
    }

    return isMyMessage && <ReadReceipts message={message} />;
  };

  return (
    <Pressable onLongPress={onLongPress}>
      <Animated.View 
        className={getBubbleStyle()}
        style={messageAnimation}
      >
        {!isMyMessage && (
          <Text className="text-xs text-gray-500 mb-1">
            {message.user_id.firstName}
          </Text>
        )}
        
        {renderContent()}
        
        <View className="flex-row items-center justify-end mt-1">
          <Text className={`
            text-xs ${isMyMessage ? 'text-white/70' : 'text-gray-500'}
          `}>
            {format(new Date(message.createdAt), 'HH:mm', { locale: th })}
          </Text>
        </View>
        
        {renderStatus()}
      </Animated.View>
    </Pressable>
  );
};

export default React.memo(MessageBubble);