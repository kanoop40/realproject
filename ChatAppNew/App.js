import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext_Mock';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/admin/AdminScreen';
import AddUserScreen from './screens/admin/AddUserScreen';
import UserDetailScreen from './screens/admin/UserDetailScreen';
import ChatScreen from './screens/user/ChatScreen';
import PrivateChatScreen from './screens/user/PrivateChatScreen';
import NewSearchUserScreen from './screens/user/NewSearchUserScreen';
import ProfileScreen from './screens/user/ProfileScreen';
import EditProfileScreen from './screens/user/EditProfileScreen';
import ChangePasswordScreen from './screens/user/ChangePasswordScreen';
import CreateGroupScreen from './screens/user/CreateGroupScreen';
import EditGroupScreen from './screens/user/EditGroupScreen';
import GroupChatScreen from './screens/user/GroupChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  console.log('ChatAppNew is starting...');

  return (
    <AuthProvider>
      <SocketProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ 
            headerShown: false,
            animation: 'fade',
            animationDuration: 300
          }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="AddUser" component={AddUserScreen} />
            <Stack.Screen name="UserDetail" component={UserDetailScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
            <Stack.Screen name="Search" component={NewSearchUserScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="EditGroup" component={EditGroupScreen} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}