import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/Auth/LoginScreen';
import ChatListScreen from './src/screens/Chat/ChatListScreen';
import ChatScreen from './src/screens/Chat/ChatScreen';
import SearchScreen from './src/screens/Search/SearchScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import GroupInfoScreen from './src/screens/Group/GroupInfoScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ChatList" 
          component={ChatListScreen} 
          options={{ title: 'การสนทนา' }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={({ route }) => ({ title: route.params?.userName })}
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ title: 'ค้นหา' }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'โปรไฟล์' }}
        />
        <Stack.Screen 
          name="GroupInfo" 
          component={GroupInfoScreen}
          options={{ title: 'ข้อมูลกลุ่ม' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}