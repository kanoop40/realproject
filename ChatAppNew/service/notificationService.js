// Enhanced notification service with expo-notifications for proper push notification support
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Set notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  currentUserId = null;
  currentUserName = null;
  expoPushToken = null;
  notificationListener = null;
  responseListener = null;

  // อัปเดตข้อมูลผู้ใช้ปัจจุบัน
  setCurrentUser(user) {
    this.currentUserId = user?._id || null;
    this.currentUserName = user ? `${user.firstName} ${user.lastName}` : null;
    console.log('🔔 NotificationService: Updated current user:', this.currentUserName, this.currentUserId);
  }

  // ล้างข้อมูลผู้ใช้เมื่อ logout
  async clearCurrentUser() {
    console.log('🔔 NotificationService: Clearing current user data');
    
    // ลบ push token จาก backend ก่อน logout
    if (this.currentUserId && this.expoPushToken) {
      try {
        console.log('🗑️ Removing push token from backend...');
        await this.updatePushToken(null); // ส่ง null เพื่อลบ token
        console.log('✅ Push token removed from backend');
      } catch (error) {
        console.error('❌ Failed to remove push token from backend:', error);
      }
    }
    
    // ล้างข้อมูลใน service
    this.currentUserId = null;
    this.currentUserName = null;
    this.expoPushToken = null;
    console.log('✅ NotificationService: All user data cleared');
  }

  // ลงทะเบียนสำหรับ push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
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
        console.log('🔔 Failed to get push token for push notification!');
        Alert.alert(
          'การแจ้งเตือน', 
          'ไม่สามารถเปิดการแจ้งเตือนได้ กรุณาเปิดการแจ้งเตือนในการตั้งค่า'
        );
        return null;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.log('🔔 No Expo project ID found');
        }
        
        token = (await Notifications.getExpoPushTokenAsync({ 
          projectId: projectId 
        })).data;
        
        // เพิ่มข้อมูลระบุตัวตนเครื่อง เพื่อป้องกัน token collision
        const deviceInfo = {
          token: token,
          platform: Platform.OS,
          deviceId: Device.osInternalBuildId || Device.osBuildId || 'unknown',
          deviceName: Device.deviceName || 'unknown',
          timestamp: Date.now()
        };
        
        console.log('🔔 Expo push token:', token);
        console.log('📱 Device info:', {
          platform: deviceInfo.platform,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName
        });
        
        this.expoPushToken = token;
        
        // บันทึก token และข้อมูลเครื่องใน AsyncStorage
        await AsyncStorage.setItem('expo_push_token', token);
        await AsyncStorage.setItem('device_info', JSON.stringify(deviceInfo));
        
      } catch (error) {
        console.error('🔔 Error getting expo push token:', error);
        // Fallback: ยังคงใช้งานแอปได้แม้ไม่มี push token
        return null;
      }
    } else {
      console.log('🔔 Must use physical device for Push Notifications');
    }

    return token;
  }

  // ดึง push token ที่บันทึกไว้
  async getStoredPushToken() {
    try {
      const token = await AsyncStorage.getItem('expo_push_token');
      if (token) {
        this.expoPushToken = token;
      }
      return token;
    } catch (error) {
      console.error('🔔 Error getting stored push token:', error);
      return null;
    }
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

  // ส่งการแจ้งเตือนผ่าน Expo Push Notification
  async schedulePushNotification(title, body, data = {}, trigger = null) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: trigger || { seconds: 1 }, // ส่งทันที
      });
      
      console.log('🔔 Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('🔔 Error scheduling notification:', error);
      return null;
    }
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

  // ตรวจสอบสิทธิ์การแจ้งเตือน
  async checkPermissions() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return {
        status: settings.status,
        canAskAgain: settings.canAskAgain,
        granted: settings.granted
      };
    } catch (error) {
      console.error('🔔 Error checking permissions:', error);
      return {
        status: 'undetermined',
        canAskAgain: true,
        granted: false
      };
    }
  }

  // ขอสิทธิ์การแจ้งเตือน
  async requestPermissions() {
    try {
      const settings = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });
      return {
        status: settings.status,
        canAskAgain: settings.canAskAgain,
        granted: settings.granted
      };
    } catch (error) {
      console.error('🔔 Error requesting permissions:', error);
      return {
        status: 'denied',
        canAskAgain: false,
        granted: false
      };
    }
  }

  // เพิ่ม listeners สำหรับ notifications
  addNotificationReceivedListener(listener) {
    this.notificationListener = Notifications.addNotificationReceivedListener(listener);
    return this.notificationListener;
  }

  addNotificationResponseReceivedListener(listener) {
    this.responseListener = Notifications.addNotificationResponseReceivedListener(listener);
    return this.responseListener;
  }

  // อัปเดต push token ใน backend
  async updatePushToken(token) {
    try {
      if (!this.currentUserId) {
        console.log('🔔 No current user - skipping token update');
        return;
      }

      console.log('🔔 Updating push token in backend:', token ? 'SET' : 'REMOVE');
      
      // Import api here to avoid circular dependency
      const { default: api } = await import('./api');
      
      // ดึงข้อมูลเครื่องมาส่งด้วย
      let deviceInfo = {};
      try {
        const deviceInfoStr = await AsyncStorage.getItem('device_info');
        if (deviceInfoStr) {
          deviceInfo = JSON.parse(deviceInfoStr);
        }
      } catch (err) {
        console.log('⚠️ Could not load device info:', err);
      }

      const response = await api.post('/users/push-token', {
        pushToken: token,
        deviceInfo: {
          platform: deviceInfo.platform || Platform.OS,
          deviceId: deviceInfo.deviceId || 'unknown',
          deviceName: deviceInfo.deviceName || 'unknown'
        }
      });
      
      console.log('✅ Push token updated successfully:', response.data);
    } catch (error) {
      console.error('❌ Error updating push token:', error);
      throw error; // Re-throw เพื่อให้ caller จัดการ
    }
  }

  // ล้าง badge count
  async clearBadgeCount() {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('🔔 Badge count cleared');
    } catch (error) {
      console.error('🔔 Error clearing badge count:', error);
    }
  }

  // ตั้งค่า badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('🔔 Badge count set to:', count);
    } catch (error) {
      console.error('🔔 Error setting badge count:', error);
    }
  }

  // ลบ listeners เมื่อไม่ใช้งาน
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }
}

export default new NotificationService();
