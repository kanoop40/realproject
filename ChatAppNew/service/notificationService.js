// Simple notification service without expo-notifications for compatibility
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
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
  }

  // Mock function สำหรับการลงทะเบียน push notifications
  async registerForPushNotificationsAsync() {
    console.log('🔔 Push notifications disabled in development mode');
    return null;
  }

  // แสดงการแจ้งเตือนในแอป (ใช้ Alert แทน push notification)
  showInAppNotification(title, body, data = {}) {
    // ไม่แสดงการแจ้งเตือนถ้าเป็นข้อความจากตัวเอง
    if (data.senderId === this.currentUserId) {
      return;
    }

    console.log('🔔 In-app notification:', { title, body, data });
    
    // แสดง Alert แทนการแจ้งเตือน push
    Alert.alert(
      title || 'ข้อความใหม่',
      body || 'คุณมีข้อความใหม่',
      [
        {
          text: 'ตกลง',
          style: 'default'
        }
      ],
      { cancelable: true }
    );
  }

  // ส่งการแจ้งเตือนเมื่อมีข้อความใหม่
  async sendMessageNotification({ recipientId, senderName, message, chatroomId }) {
    try {
      console.log('🔔 Sending notification:', { recipientId, senderName, message, chatroomId });
      
      // ในโหมด development ใช้ in-app notification
      this.showInAppNotification(
        `ข้อความจาก ${senderName}`,
        message,
        { 
          senderId: this.currentUserId,
          recipientId,
          chatroomId 
        }
      );

      return { success: true, method: 'in-app' };
    } catch (error) {
      console.error('🔔 Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ตั้งค่าการแจ้งเตือน (Mock function)
  async updateNotificationSettings(settings) {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      console.log('🔔 Notification settings updated:', settings);
      return true;
    } catch (error) {
      console.error('🔔 Error updating notification settings:', error);
      return false;
    }
  }

  // ดึงการตั้งค่าการแจ้งเตือน
  async getNotificationSettings() {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      return settings ? JSON.parse(settings) : {
        enabled: true,
        sound: true,
        vibration: true,
        showPreview: true
      };
    } catch (error) {
      console.error('🔔 Error getting notification settings:', error);
      return {
        enabled: true,
        sound: true,
        vibration: true,
        showPreview: true
      };
    }
  }

  // ตรวจสอบสิทธิ์การแจ้งเตือน (Mock function)
  async checkPermissions() {
    return {
      status: 'granted',
      canAskAgain: true,
      granted: true
    };
  }

  // ขอสิทธิ์การแจ้งเตือน (Mock function)
  async requestPermissions() {
    return {
      status: 'granted',
      canAskAgain: true,
      granted: true
    };
  }
}

export default new NotificationService();
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
