import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element'; // Use Shared Element Navigator
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import SearchUserScreen from '../screens/SearchUserScreen.js';
import ChatRoomScreen from '../screens/ChatRoomScreen';

const Stack = createSharedElementStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false, // Hide headers globally
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 800 } }, // Customize transition duration
            close: { animation: 'timing', config: { duration: 800 } },
          },
        }}
        sharedElements={(route, otherRoute, showing) => {
          return [{ id: 'sharedLogo', animation: 'fade' }]; // Shared element transition for logo
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'สมัครสมาชิก',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'แชท' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: 'สร้างกลุ่ม' }}
      />
      <Stack.Screen
        name="SearchUser"
        component={SearchUserScreen}
        options={{ title: 'ค้นหาผู้ใช้' }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ title: 'ห้องแชท' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;