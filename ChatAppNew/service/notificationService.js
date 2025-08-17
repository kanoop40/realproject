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

  // แสดงการแจ้งเตือนในแอป
  showInAppNotification(title, body, data = {}) {
    // ไม่แสดงการแจ้งเตือนถ้าเป็นข้อความจากตัวเอง
    const senderIdString = data.senderId?.toString();
    const currentUserIdString = this.currentUserId?.toString();
    
    if (senderIdString === currentUserIdString) {
      console.log('🔔 Skipping notification for own message');
      return;
    }

    console.log('🔔 Showing in-app notification:', { title, body, data });
    console.log('🔔 Sender ID:', senderIdString, 'Current User ID:', currentUserIdString);
    
    // ใช้ setTimeout เพื่อให้แน่ใจว่า Alert จะแสดงแม้อยู่ในหน้าแชท
    setTimeout(() => {
      try {
        // แสดง Alert popup สำหรับการแจ้งเตือน
        Alert.alert(
          title || 'ข้อความใหม่',
          body || 'คุณมีข้อความใหม่',
          [
            {
              text: 'ดูข้อความ',
              style: 'default',
              onPress: () => {
                // TODO: Navigate to chat if needed
                console.log('🔔 User pressed "ดูข้อความ"');
              }
            },
            {
              text: 'ตกลง',
              style: 'cancel'
            }
          ],
          { 
            cancelable: true,
            onDismiss: () => {
              console.log('🔔 Notification dismissed');
            }
          }
        );
        console.log('🔔 Alert displayed successfully');
      } catch (error) {
        console.error('🔔 Error showing alert:', error);
      }
    }, 100); // เพิ่ม delay เล็กน้อย
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

  // จัดการข้อความใหม่ที่ได้รับจาก Socket (Global notification)
  async handleNewMessage(messageContent, senderName, chatroomId, senderId) {
    try {
      console.log('🔔 GlobalNotification: Handling new message from:', senderName);
      console.log('🔔 GlobalNotification: Message:', messageContent);
      console.log('🔔 GlobalNotification: Chatroom:', chatroomId);
      console.log('🔔 GlobalNotification: Sender ID:', senderId);
      console.log('🔔 GlobalNotification: Current User ID:', this.currentUserId);

      // ไม่แจ้งเตือนข้อความของตัวเอง
      const senderIdString = senderId?.toString();
      const currentUserIdString = this.currentUserId?.toString();
      
      if (senderIdString === currentUserIdString) {
        console.log('🔔 GlobalNotification: Skipping own message');
        return;
      }

      // ตรวจสอบการตั้งค่าการแจ้งเตือน
      const settings = await this.getNotificationSettings();
      if (!settings.enabled) {
        console.log('🔔 GlobalNotification: Notifications disabled');
        return;
      }

      // แสดงการแจ้งเตือนแบบ global
      console.log('🔔 GlobalNotification: Showing notification');
      this.showInAppNotification(
        `ข้อความจาก ${senderName}`,
        messageContent,
        {
          senderId: senderId,
          chatroomId: chatroomId,
          senderName: senderName
        }
      );
      
    } catch (error) {
      console.error('🔔 GlobalNotification: Error handling new message:', error);
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
    console.log('� Badge count cleared (mock)');
  }
}

export default new NotificationService();
