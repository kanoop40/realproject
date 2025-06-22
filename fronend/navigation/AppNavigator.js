import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element'; // Use Shared Element Navigator
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
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
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin Dashboard' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;