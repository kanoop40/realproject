import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import NotificationService from './service/notificationService';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/admin/AdminScreen';
import AddUserScreen from './screens/admin/AddUserScreen';
import ManageDataScreen from './screens/admin/ManageDataScreen';
import UserDetailScreen from './screens/admin/UserDetailScreen';
import ChatScreenWithTabBar from './screens/user/ChatScreen';
import PrivateChatScreen from './screens/user/PrivateChatScreen';
import GroupChatScreen from './screens/user/GroupChatScreen';
import ProfileScreenWithTabBar from './screens/user/ProfileScreen';
import CreateGroupScreen from './screens/user/CreateGroupScreen';
import EditGroupScreen from './screens/user/EditGroupScreen';
import SearchUserScreenWithTabBar from './screens/user/SearchUserScreen';
import EditProfileScreen from './screens/user/EditProfileScreen';
import ChangePasswordScreen from './screens/user/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    console.log('🔔 Setting up notification listeners...');

    // Initialize notification service
    NotificationService.registerForPushNotificationsAsync();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      // แสดงการแจ้งเตือนแม้ว่าแอปจะเปิดอยู่
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification response:', response);
      
      // Handle navigation based on notification data
      const data = response.notification.request.content.data;
      if (data.chatroomId && navigationRef.current) {
        // Navigate to specific chat
        if (data.type === 'group_chat') {
          navigationRef.current.navigate('GroupChat', { 
            chatroomId: data.chatroomId,
            chatroomName: data.chatroomName || 'แชทกลุ่ม'
          });
        } else if (data.type === 'private_chat') {
          navigationRef.current.navigate('PrivateChat', { 
            chatroomId: data.chatroomId,
            recipientName: data.senderName || 'แชทส่วนตัว'
          });
        }
      }
    });

    return () => {
      console.log('🔔 Removing notification listeners...');
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  console.log('ChatAppNew is starting...');

  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ 
              headerShown: false,
              animation: 'fade',
              animationDuration: 300
            }}>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="AddUser" component={AddUserScreen} />
              <Stack.Screen name="ManageData" component={ManageDataScreen} />
              <Stack.Screen name="UserDetail" component={UserDetailScreen} />
              <Stack.Screen name="Chat" component={ChatScreenWithTabBar} />
              <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
              <Stack.Screen name="GroupChat" component={GroupChatScreen} />
              <Stack.Screen name="Profile" component={ProfileScreenWithTabBar} />
              <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
              <Stack.Screen name="EditGroup" component={EditGroupScreen} />
              <Stack.Screen name="SearchUser" component={SearchUserScreenWithTabBar} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}