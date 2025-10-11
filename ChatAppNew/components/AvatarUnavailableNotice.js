import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AvatarUnavailableNotice = () => (
  <View style={styles.container}>
    <Text style={styles.title}>📷 เกี่ยวกับรูปโปรไฟล์</Text>
    <Text style={styles.text}>
      เนื่องจากเซิร์ฟเวอร์ใช้ Render.com Free Tier
    </Text>
    <Text style={styles.text}>
      รูปโปรไฟล์ที่อัปโหลดจะหายไปเมื่อมีการอัปเดตระบบ
    </Text>
    <Text style={styles.subText}>
      ระบบจะแสดงตัวอักษรย่อของชื่อแทน
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    margin: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  text: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  subText: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default AvatarUnavailableNotice;
