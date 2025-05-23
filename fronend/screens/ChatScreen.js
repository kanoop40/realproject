import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import socket from '../api/socket';

const ChatScreen = () => {
  useEffect(() => {
    socket.emit('joinRoom', 'roomid123');

    socket.on('receiveMessage', (msg) => {
      // เพิ่มข้อความลง state
    });

    return () => socket.off('receiveMessage');
  }, []);

  return (
    <View>
      <Text>ห้องแชท</Text>
      {/* รายการข้อความแชท */}
    </View>
  );
};

export default ChatScreen;