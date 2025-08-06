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

  // Mock functions สำหรับความเข้ากันได้
  addNotificationReceivedListener(listener) {
    return { remove: () => {} };
  }

  addNotificationResponseReceivedListener(listener) {
    return { remove: () => {} };
  }

  async clearBadgeCount() {
    console.log('🔔 Badge count cleared (mock)');
  }
}

export default new NotificationService();
