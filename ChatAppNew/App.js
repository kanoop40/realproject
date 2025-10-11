import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/admin/AdminScreen';
import ChatScreen from './screens/user/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  console.log('ChatAppNew is starting...');

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ 
          headerShown: false,
          animation: 'fade',
          animationDuration: 300
        }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}