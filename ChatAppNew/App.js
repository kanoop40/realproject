import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/admin/AdminScreen';
import AddUserScreen from './screens/admin/AddUserScreen';
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
  console.log('ChatAppNew is starting...');

  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
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