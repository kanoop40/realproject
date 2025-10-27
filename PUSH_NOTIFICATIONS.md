# 🔔 Push Notification System Documentation

## Overview
This chat application now supports full push notification functionality for messages sent when users are outside the app (backgrounded or closed).

## Architecture

### Frontend (React Native/Expo)
- **expo-notifications**: Handles push notification registration, permissions, and display
- **NotificationService.js**: Manages notification registration and local notifications
- **App.js**: Sets up notification listeners and handles navigation from notifications
- **AuthContext.js**: Automatically registers push tokens on login and app load

### Backend (Node.js/Express)
- **expo-server-sdk**: Sends push notifications to Expo's servers
- **NotificationService.js**: Utility for sending push notifications
- **User Model**: Stores push tokens for each user
- **Chat Controllers**: Integrate push notifications with message sending

## Features

### ✅ Implemented Features
1. **Push Token Management**
   - Automatic registration on login
   - Token storage in user database
   - Token updates when app loads

2. **Push Notifications for Private Chats**
   - Sent when recipient is not in the current chat
   - Includes sender name and message preview
   - Handles file messages (shows "📷 รูปภาพ" or "📎 ไฟล์")

3. **Push Notifications for Group Chats**
   - Sent to all group members except sender
   - Shows group name and sender
   - Handles all message types

4. **Notification Handling**
   - Foreground notifications (in-app alerts)
   - Background notifications (system notifications)
   - Navigation to chat when notification is tapped
   - Sound, badge, and vibration support

5. **Permission Management**
   - Automatic permission requests
   - Graceful fallback if permissions denied
   - Settings checking and requesting

## API Endpoints

### POST /api/users/push-token
Updates the user's push token for notifications.

**Request:**
```json
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response:**
```json
{
  "message": "อัปเดต Push Token สำเร็จ",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

## Testing

### Prerequisites
1. Physical device (notifications don't work in simulators)
2. Expo Go app or development build
3. Push notification permissions enabled

### Test Steps
1. **Start Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Expo App:**
   ```bash
   cd ChatAppNew
   expo start
   ```

3. **Test Push Notifications:**
   - Login with two different accounts on different devices
   - Send a message from device A
   - Background/close the app on device B
   - Device B should receive a push notification

4. **Test Notification Navigation:**
   - Tap on the received notification
   - App should open and navigate to the correct chat

### Quick Test Script
Run the test script to verify system configuration:
```bash
node test-notifications.js
```

## Configuration Files

### Frontend Configuration
- **app.json**: Contains Expo project ID for push notifications
- **package.json**: Includes expo-notifications dependency

### Backend Configuration
- **UserModel.js**: Includes pushToken field
- **userRoutes.js**: Includes push-token endpoint
- **userController.js**: Includes updatePushToken function

## Troubleshooting

### Common Issues

1. **Notifications not received:**
   - Check if using physical device (required)
   - Verify push notification permissions are granted
   - Check if pushToken is properly stored in database
   - Ensure Expo project ID is correct in app.json

2. **App crashes on notification:**
   - Check console for errors
   - Verify all dependencies are properly installed
   - Ensure notification data structure is correct

3. **Navigation not working from notification:**
   - Check that chatroomId is included in notification data
   - Verify navigation routes are properly configured
   - Ensure App.js notification listeners are set up

### Debug Steps

1. **Check Push Token Registration:**
   ```javascript
   // In app console, check if token is generated
   console.log('Push token:', await NotificationService.registerForPushNotificationsAsync());
   ```

2. **Verify Backend Notification Sending:**
   ```javascript
   // Check backend logs for notification sending
   console.log('Notification sent:', result);
   ```

3. **Test Local Notifications:**
   ```javascript
   // Test local notification scheduling
   await NotificationService.schedulePushNotification('Test', 'Local notification test');
   ```

## Security Considerations

1. **Push Token Protection:**
   - Tokens are stored securely in database
   - Only authenticated users can update their tokens
   - Tokens are not exposed in API responses

2. **Notification Content:**
   - Message previews are limited in length
   - Sensitive information should not be included
   - File messages show generic descriptions

3. **Rate Limiting:**
   - Backend implements rate limiting to prevent spam
   - Notification sending is throttled appropriately

## Performance Optimization

1. **Batch Processing:**
   - Group notifications sent efficiently
   - Bulk notification API used when possible

2. **Error Handling:**
   - Individual notification failures don't affect others
   - Graceful fallbacks for expired tokens

3. **Token Management:**
   - Tokens updated only when necessary
   - Old tokens cleaned up periodically

## Future Enhancements

### Possible Improvements
1. **Rich Notifications:**
   - Image previews in notifications
   - Action buttons (Reply, Mark as Read)

2. **Notification Settings:**
   - Per-chat notification preferences
   - Quiet hours configuration
   - Notification grouping

3. **Advanced Features:**
   - Read receipts via notifications
   - Typing indicators
   - Voice message previews

## Support

If you encounter issues:
1. Check this documentation
2. Review console logs for errors
3. Test on different devices
4. Verify all dependencies are up to date

---
**Note:** Push notifications require physical devices and proper Expo configuration. Always test thoroughly before deploying to production.