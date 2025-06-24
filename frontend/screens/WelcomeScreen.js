import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-8">
        <Image
          source={require('../assets/logo.png')}
          className="w-60 h-60 mb-8"
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-center mb-6">
          Welcome to ChatApp
        </Text>
        <View className="w-full gap-4">
          <TouchableOpacity 
            className="bg-[#FFB800] py-4 rounded-lg"
            onPress={() => navigation.navigate('Login')}
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

export default WelcomeScreen;