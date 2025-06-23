import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

const API_URL = 'http://10.0.2.2:5000/api/users';

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1. ดึง Token จาก Storage
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          // ถ้าไม่มี token ให้เด้งกลับไปหน้า Login
          navigation.replace('Login');
          return;
        }

        // 2. ส่ง Request ไปที่ /profile พร้อม Token ใน Header
        const response = await axios.get(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // 3. เก็บข้อมูล user ไว้ใน state
        setUserData(response.data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        Alert.alert('Error', 'Could not fetch user profile. Please login again.');
        // ถ้า Token หมดอายุหรือมีปัญหา ให้ลบ Token ทิ้งและกลับไปหน้า Login
        await AsyncStorage.removeItem('userToken');
        navigation.replace('Login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    // ลบ Token ออกจาก Storage
    await AsyncStorage.removeItem('userToken');
    Alert.alert('Logged Out', 'You have been successfully logged out.');
    // กลับไปหน้า Login
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <StyledView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 items-center justify-center p-5 bg-gray-100">
      <StyledText className="text-2xl font-bold mb-2">Welcome!</StyledText>
      {userData ? (
        <>
          <StyledText className="text-lg mb-1">Name: {userData.name}</StyledText>
          <StyledText className="text-lg mb-4">Email: {userData.email}</StyledText>
        </>
      ) : (
        <StyledText>Could not load user data.</StyledText>
      )}
      <Button title="Logout" onPress={handleLogout} />
    </StyledView>
  );
};

export default HomeScreen;