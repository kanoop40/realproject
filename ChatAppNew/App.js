import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/admin/AdminScreen';
import AddUserScreen from './screens/admin/AddUserScreen';
import UserDetailScreen from './screens/admin/UserDetailScreen';

import ChatScreen from './screens/user/ChatScreen';
import PrivateChatScreen from './screens/user/PrivateChatScreen';
import SearchUserScreen from './screens/user/SearchUserScreen';
import ProfileScreen from './screens/user/ProfileScreen';
import CreateGroupScreen from './screens/user/CreateGroupScreen';
import EditGroupScreen from './screens/user/EditGroupScreen';
import GroupChatScreen from './screens/user/GroupChatScreen';
import NotificationService from './service/notificationService';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef();

  useEffect(() => {
    // ตั้งค่า notifications เมื่อแอปเริ่มทำงาน (โหมด development)
    const setupNotifications = async () => {
      try {
        const token = await NotificationService.registerForPushNotificationsAsync();
        console.log('🔔 Notification setup completed:', token ? 'success' : 'disabled');
      } catch (error) {
        console.log('🔔 Notification setup error (expected in dev mode):', error.message);
      }
    };

    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
            <Stack.Screen name="Search" component={SearchUserScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} /> 
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="EditGroup" component={EditGroupScreen} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} /> 
            <Stack.Screen name="AddUser" component={AddUserScreen} />
            <Stack.Screen name="UserDetail" component={UserDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}