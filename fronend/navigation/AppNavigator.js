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
            open: { animation: 'timing', config: { duration: 800 } },
            close: { animation: 'timing', config: { duration: 800 } },
          },
        }}
        sharedElements={(route, otherRoute, showing) => {
          return [{ id: 'sharedLogo', animation: 'fade' }];
        }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddUser"
        component={AddUserScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserDashboard"
        component={UserDashboardScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;