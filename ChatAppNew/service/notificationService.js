import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePushToken } from './api';

// ตั้งค่าพฤติกรรมของ notification
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  expoPushToken = null;
  currentUserId = null;
  currentUserName = null;

  // อัปเดตข้อมูลผู้ใช้ปัจจุบัน
  setCurrentUser(user) {
    this.currentUserId = user?._id || null;
    this.currentUserName = user ? `${user.firstName} ${user.lastName}` : null;
    console.log('🔔 NotificationService: Updated current user:', this.currentUserName, this.currentUserId);
  }

  // ล้างข้อมูลผู้ใช้เมื่อ logout
  clearCurrentUser() {
    console.log('🔔 NotificationService: Clearing current user data');
    this.currentUserId = null;
    this.currentUserName = null;
    this.expoPushToken = null;
  }

  // ขออนุญาตและลงทะเบียน push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Permission to receive push notifications denied!');
        return null;
      }
      
      try {
        // ใน Expo Go จะไม่สามารถใช้ push notification ได้
        // ต้องใช้ development build หรือ standalone app
        if (__DEV__) {
          console.log('⚠️ Push notifications not available in Expo Go development mode');
          return null;
        }
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // เปลี่ยนเป็น project ID ของคุณ
        })).data;
        console.log('🔔 Push token:', token);
        
        // เก็บ token ไว้ใน AsyncStorage
        await AsyncStorage.setItem('expoPushToken', token);
        this.expoPushToken = token;
        
      } catch (error) {
        console.log('❌ Error getting push token (expected in Expo Go):', error.message);
        // ไม่ return error ให้ app ทำงานต่อได้
        return null;
      }
    } else {
      console.log('⚠️ Must use physical device for Push Notifications');
    }

    return token;
  }

  // แสดง notification ภายในแอป
  async showLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // แสดงทันที
      });
    } catch (error) {
      console.log('❌ Error showing local notification:', error);
    }
  }

  // จัดการเมื่อมีข้อความใหม่
  async handleNewMessage(message, senderName, chatroomId, senderId) {
    console.log('🔔 NotificationService: handleNewMessage called');
    console.log('🔔 Sender ID:', senderId, 'Type:', typeof senderId);
    console.log('🔔 Current User ID:', this.currentUserId, 'Type:', typeof this.currentUserId);
    console.log('🔔 Are they equal?', senderId === this.currentUserId);
    console.log('🔔 String comparison:', String(senderId) === String(this.currentUserId));
    
    // ตรวจสอบว่าข้อความมาจากตัวเองหรือไม่
    if (senderId && this.currentUserId && String(senderId) === String(this.currentUserId)) {
      console.log('🔔 NotificationService: Skipping notification for own message');
      return;
    }

    console.log('🔔 NotificationService: Showing notification for message from:', senderName);
    console.log('🔔 Current user:', this.currentUserName, 'Current ID:', this.currentUserId);
    console.log('🔔 Sender ID:', senderId);

    const title = `ข้อความใหม่จาก ${senderName}`;
    const body = message.length > 50 ? `${message.substring(0, 50)}...` : message;
    
    await this.showLocalNotification(title, body, {
      type: 'new_message',
      chatroomId,
      senderName,
      senderId,
    });
  }

  // ตั้งค่า listener สำหรับ notification ที่ถูกแตะ
  setupNotificationListeners(navigation) {
    // เมื่อแอปเปิดอยู่และได้รับ notification
    Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      console.log('🔔 Current user when notification received:', this.currentUserName);
    });

    // เมื่อผู้ใช้แตะ notification
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      console.log('👆 Current user when notification tapped:', this.currentUserName);
      
      const data = response.notification.request.content.data;
      
      if (data.type === 'new_message' && data.chatroomId) {
        // นำทางไปยังหน้าแชท
        navigation.navigate('ChatScreen', { 
          chatroomId: data.chatroomId,
          chatroomName: data.senderName 
        });
      }
    });
  }

  // ส่ง push token ไปยัง backend
  async sendTokenToBackend(token) {
    try {
      await updatePushToken(token);
      console.log('✅ Push token sent to backend');
    } catch (error) {
      console.log('❌ Error sending push token:', error);
    }
  }
}

export default new NotificationService();
