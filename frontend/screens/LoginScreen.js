import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-6">
        {/* Header */}
        <TouchableOpacity 
          className="absolute top-12 left-6"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-600">← Back</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View className="items-center mt-20 mb-10">
          <Image
            source={require('../assets/logo.png')}
            className="w-24 h-24"
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-center mb-8">
          LOGIN
        </Text>

        {/* Form */}
        <View className="space-y-4">
          <View className="w-full mb-4">
            <Text className="text-gray-600 text-sm mb-2">Username</Text>
            <TextInput
              className="w-full bg-gray-100/80 rounded-lg px-4 py-3"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View className="w-full mb-4">
            <Text className="text-gray-600 text-sm mb-2">Password</Text>
            <TextInput
              className="w-full bg-gray-100/80 rounded-lg px-4 py-3"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity className="bg-[#FFB800] rounded-lg py-3 px-6">
            <Text className="text-white text-center font-semibold text-lg">
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-4">
            <Text className="text-[#FFB800] text-center">
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;