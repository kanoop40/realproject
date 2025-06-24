import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        {/* Logo */}
        <Image
          source={require('../assets/logo.png')}
          className="w-28 h-28 mb-20"
          resizeMode="contain"
        />

        {/* Login Button */}
        <TouchableOpacity 
          className="bg-[#FFB800] w-[150px] py-3 rounded-lg"
          onPress={() => navigation.navigate('Login')}
        >
          <Text className="text-white text-center text-lg">
            Login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;