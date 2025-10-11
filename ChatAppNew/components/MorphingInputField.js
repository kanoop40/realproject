import React, { useEffect } from 'react';
import { TextInput, TouchableOpacity, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';

const MorphingInputField = ({ 
  value, 
  onChangeText, 
  hasContent,
  onSend,
  isSending,
  disabled,
  style,
  ...textInputProps 
}) => {
  const inputAnimation = useSharedValue(0);
  const sendButtonAnimation = useSharedValue(0);

  useEffect(() => {
    inputAnimation.value = withSpring(hasContent ? 1 : 0, {
      damping: 15,
      stiffness: 200
    });
  }, [hasContent]);

  useEffect(() => {
    sendButtonAnimation.value = withSpring(
      (hasContent && !disabled) ? 1 : 0, 
      { damping: 15, stiffness: 200 }
    );
  }, [hasContent, disabled]);

  const inputStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      inputAnimation.value,
      [0, 1],
      ['#e2e8f0', '#3b82f6']
    );
    
    const scale = interpolate(inputAnimation.value, [0, 1], [1, 1.02]);
    const shadowOpacity = interpolate(inputAnimation.value, [0, 1], [0.1, 0.2]);

    return {
      borderColor,
      transform: [{ scale }],
      shadowOpacity,
    };
  });

  const sendButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(sendButtonAnimation.value, [0, 1], [0.8, 1]);
    const opacity = sendButtonAnimation.value;
    const backgroundColor = interpolateColor(
      sendButtonAnimation.value,
      [0, 1],
      ['#9ca3af', '#3b82f6']
    );

    return {
      transform: [{ scale }],
      opacity,
      backgroundColor,
    };
  });

  return (
    <Animated.View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
      },
      inputStyle,
      style
    ]}>
      <TextInput
        style={[
          {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 16,
            color: '#1f2937',
            backgroundColor: 'transparent',
            maxHeight: 100,
          }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder="พิมพ์ข้อความ..."
        placeholderTextColor="#9ca3af"
        multiline
        maxLength={1000}
        {...textInputProps}
      />
      
      <Animated.View style={[
        {
          marginLeft: 8,
          borderRadius: 18,
          minWidth: 40,
          height: 36,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        sendButtonStyle
      ]}>
        <TouchableOpacity
          onPress={onSend}
          disabled={disabled || !hasContent}
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 18,
          }}
        >
          <Text style={{
            color: '#ffffff',
            fontWeight: '600',
            fontSize: 14,
          }}>
            {isSending ? '...' : 'ส่ง'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default MorphingInputField;