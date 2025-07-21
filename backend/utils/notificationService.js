const { Expo } = require('expo-server-sdk');

// สร้าง Expo SDK client
const expo = new Expo();

class NotificationService {
  // ส่ง notification ไปยัง push token
  async sendPushNotification(pushToken, title, body, data = {}) {
    try {
      // ตรวจสอบว่า push token ถูกต้องหรือไม่
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} ไม่ถูกต้อง`);
        return false;
      }

      // สร้าง message object
      const message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high'
      };

      // ส่ง notification
      const chunks = expo.chunkPushNotifications([message]);
      const tickets = [];

      for (let chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending notification chunk:', error);
        }
      }

      console.log('✅ Push notification sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  // ส่ง notification เมื่อมีข้อความใหม่
  async sendNewMessageNotification(recipientPushToken, senderName, message, chatroomId) {
    const title = `ข้อความใหม่จาก ${senderName}`;
    const body = message.length > 50 ? `${message.substring(0, 50)}...` : message;
    
    const data = {
      type: 'new_message',
      chatroomId: chatroomId,
      senderName: senderName
    };

    return await this.sendPushNotification(recipientPushToken, title, body, data);
  }

  // ส่ง notification ไปยังหลายคน
  async sendBulkNotifications(pushTokens, title, body, data = {}) {
    const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
    
    if (validTokens.length === 0) {
      console.log('⚠️ No valid push tokens found');
      return false;
    }

    try {
      const messages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high'
      }));

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (let chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending bulk notification chunk:', error);
        }
      }

      console.log(`✅ Bulk notifications sent to ${validTokens.length} recipients`);
      return true;

    } catch (error) {
      console.error('❌ Error sending bulk notifications:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
