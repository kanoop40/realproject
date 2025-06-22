import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AddUserScreen from '../screens/AddUserScreen';
import UserDashboardScreen from '../screens/UserDashboardScreen';

const Stack = createSharedElementStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardOverlayEnabled: true,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f8f9fa' },
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f8f9fa' },
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 1000,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 800,
              },
            },
          },
          cardStyleInterpolator: ({ current, next, layouts }) => {
            return {
              cardStyle: {
                opacity: current.progress,
              },
            };
          },
        }}
        sharedElements={(route, otherRoute, showing) => {
          return [
            {
              id: 'logo',
              animation: 'move',
              resize: 'clip',
              align: 'center-top',
            },
            {
              id: 'loginButton',
              animation: 'fade',
              resize: 'clip',
              align: 'center-bottom',
            },
          ];
        }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f5' },
        }}
      />
      <Stack.Screen
        name="AddUser"
        component={AddUserScreen}
        options={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f5' },
        }}
      />
      <Stack.Screen
        name="UserDashboard"
        component={UserDashboardScreen}
        options={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f5' },
        }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;