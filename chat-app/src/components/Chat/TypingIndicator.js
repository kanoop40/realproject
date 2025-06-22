import React from 'react';
import { View, Text, Animated } from 'react-native';

const TypingIndicator = ({ typingUsers }) => {
  // Animation for dots
  const [dot1] = React.useState(new Animated.Value(0));
  const [dot2] = React.useState(new Animated.Value(0));
  const [dot3] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dot1, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 1,
            duration: 200,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 1,
            duration: 200,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dot1, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0,
            duration: 200,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 200,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        animateDots();
      });
    };

    if (typingUsers.length > 0) {
      animateDots();
    }

    return () => {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [typingUsers.length]);

  if (!typingUsers.length) return null;

  return (
    <View className="flex-row items-center px-4 py-2">
      <Text className="text-gray-600 text-sm">
        {typingUsers.length === 1
          ? `${typingUsers[0].username} กำลังพิมพ์`
          : `${typingUsers.length} คนกำลังพิมพ์`}
      </Text>
      <View className="flex-row ml-2">
        {[dot1, dot2, dot3].map((dot, index) => (
          <Animated.View
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-0.5"
            style={{
              transform: [{
                scale: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5],
                }),
              }],
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            }}
          />
        ))}
      </View>
    </View>
  );
};

export default TypingIndicator;