import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: Implement login logic here
    console.log('Login:', { username, password });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-8">
        {/* Logo */}
        <View className="items-center mb-8">
          <Image
            source={require('../assets/logo.png')}
            className="w-32 h-32"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-center mt-4">
            LOGIN
          </Text>
        </View>

        {/* Login Form */}
        <View className="space-y-4">
          {/* Username Input */}
          <View>
            <Text className="text-gray-600 mb-2">Username</Text>
            <TextInput
              className="w-full bg-gray-100 rounded-lg px-4 py-3"
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View>
            <Text className="text-gray-600 mb-2">Password</Text>
            <TextInput
              className="w-full bg-gray-100 rounded-lg px-4 py-3"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="bg-[#FFB800] rounded-lg py-3 mt-6"
            onPress={handleLogin}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;