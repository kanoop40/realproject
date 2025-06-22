import React from 'react';
import { View, Text, Animated } from 'react-native';

const OfflineNotice = () => {
  const [slideAnim] = React.useState(new Animated.Value(-50));

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      className="bg-red-500 px-4 py-2"
      style={{
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Text className="text-white text-center">
        ไม่มีการเชื่อมต่ออินเทอร์เน็ต
      </Text>
    </Animated.View>
  );
};

export default OfflineNotice;