import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  console.log('App is starting...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello ChatApp!</Text>
      <Text style={styles.subtext}>App is working correctly</Text>
    </View>
  );
}
            animationDuration: 300
          }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
            <Stack.Screen name="Search" component={NewSearchUserScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} /> 
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="EditGroup" component={EditGroupScreen} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} /> 
            <Stack.Screen name="AddUser" component={AddUserScreen} />
            <Stack.Screen name="UserDetail" component={UserDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}