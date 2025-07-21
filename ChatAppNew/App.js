import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/admin/AdminScreen';
import AddUserScreen from './screens/admin/AddUserScreen';
import UserDetailScreen from './screens/admin/UserDetailScreen';

import ChatScreen from './screens/user/ChatScreen';
import SearchUserScreen from './screens/user/SearchUserScreen';
import ProfileScreen from './screens/user/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Search" component={SearchUserScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} /> 
          <Stack.Screen name="AddUser" component={AddUserScreen} />
          <Stack.Screen name="UserDetail" component={UserDetailScreen} />
         
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}