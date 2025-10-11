// Avatar utility functions
import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { API_URL } from './api';

// ตรวจสอบว่า avatar URL สามารถเข้าถึงได้หรือไม่
export const validateAvatarUrl = async (avatarPath) => {
  if (!avatarPath) return false;
  
  try {
    const url = avatarPath.startsWith('http') 
      ? avatarPath 
      : `${API_URL}/${avatarPath.replace(/\\/g, '/').replace(/^\/+/, '')}`;
    
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.log('Avatar validation failed:', error.message);
    return false;
  }
};

// สร้าง avatar URL ที่ปลอดภัย
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  
  // ถ้าเป็น URL แบบเต็มแล้ว (Cloudinary, HTTP/HTTPS) ให้ใช้เลย
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // ถ้าเป็น path แบบเก่า (local storage) ให้ต่อ API_URL
  return `${API_URL}/${avatarPath.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

// สร้าง initials จากชื่อ
export const getInitials = (firstName, lastName) => {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || '?';
};

// สร้าง avatar component ที่มี fallback
export const AvatarImage = ({ 
  avatarPath, 
  firstName, 
  lastName, 
  style, 
  defaultStyle,
  textStyle,
  size = 50 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const avatarUrl = getAvatarUrl(avatarPath);
  const initials = getInitials(firstName, lastName);
  
  if (!avatarUrl || imageError) {
    return (
      <View style={[{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center'
      }, defaultStyle]}>
        <Text style={[{
          color: 'white',
          fontSize: size * 0.3,
          fontWeight: 'bold'
        }, textStyle]}>
          {initials}
        </Text>
      </View>
    );
  }
  
  return (
    <Image
      source={{ uri: avatarUrl }}
      style={[{
        width: size,
        height: size,
        borderRadius: size / 2
      }, style]}
      onLoad={() => setImageLoading(false)}
      onError={() => {
        console.log('Avatar failed to load:', avatarUrl);
        setImageError(true);
        setImageLoading(false);
      }}
      defaultSource={require('../assets/default-avatar.jpg')}
    />
  );
};
