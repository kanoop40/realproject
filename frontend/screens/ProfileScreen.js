import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const ProfileScreen = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('http://10.0.2.2:5000/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUser(response.data);
      setEditForm({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        email: response.data.email
      });
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
  };

  const handleImagePick = () => {
    ImagePicker.launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true
    }, async (response) => {
      if (response.didCancel) return;

      try {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        formData.append('profile', {
          uri: response.assets[0].uri,
          type: response.assets[0].type,
          name: response.assets[0].fileName
        });

        await axios.post('http://10.0.2.2:5000/api/users/profile-image', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        loadUserProfile();
      } catch (error) {
        Alert.alert('Error', 'ไม่สามารถอัพโหลดรูปภาพได้');
      }
    });
  };

  const handleSaveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.put('http://10.0.2.2:5000/api/users/me', editForm, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setIsEditing(false);
      loadUserProfile();
      Alert.alert('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถแก้ไขข้อมูลได้');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={handleImagePick}
      >
        {user?.profileImage ? (
          <Image 
            source={{ uri: user.profileImage }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>
              {user?.firstName?.charAt(0)