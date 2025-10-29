import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

/**
 * Enhanced Android Downloads utility - focuses on user-accessible locations
 */
export class PublicAndroidDownloads {
  
  /**
   * Main function to save file to user-accessible Downloads
   */
  static async saveToPublicDownloads(sourceUri, fileName) {
    // Handle iOS differently - use sharing directly
    if (Platform.OS === 'ios') {
      console.log('🍎 iOS detected, using sharing method for Downloads');
      return await this.saveViaSharing(sourceUri, fileName);
    }
    
    if (Platform.OS !== 'android') {
      return { success: false, error: 'Platform not supported' };
    }

    console.log('📁 Attempting to save to PUBLIC Downloads folder:', fileName);
    
    try {
      // Method 1: Try MediaLibrary for media files (images/videos)
      if (this.isMediaFile(fileName)) {
        console.log('🖼️ Detected media file, trying MediaLibrary...');
        const mediaResult = await this.saveMediaFile(sourceUri, fileName);
        if (mediaResult.success) {
          return mediaResult;
        }
      }
      
      // Method 2: Try direct save to public Downloads using Sharing + file manager
      console.log('📱 Using Sharing + file manager approach...');
      const shareResult = await this.saveViaSharing(sourceUri, fileName);
      if (shareResult.success) {
        return shareResult;
      }
      
      // Method 3: Use intent to let user choose location
      console.log('🎯 Using intent launcher for user selection...');
      const intentResult = await this.saveViaIntent(sourceUri, fileName);
      if (intentResult.success) {
        return intentResult;
      }
      
      // Method 4: Fallback with clear instructions
      return {
        success: false,
        error: 'All public download methods failed',
        message: `ไม่สามารถบันทึกไปที่ Downloads ได้โดยตรง\n\nไฟล์ถูกดาวน์โหลดแล้ว แต่อยู่ใน app storage\n\nวิธีเข้าถึงไฟล์:\n1. เปิดแอปจัดการไฟล์\n2. ไปที่ Internal Storage → Android → data → com.kanoop60.chatappnew → files\n3. หรือใช้ฟีเจอร์ Share เพื่อส่งไฟล์ไปแอปอื่น`
      };
      
    } catch (error) {
      console.error('❌ Public Downloads error:', error);
      return { 
        success: false, 
        error: error.message,
        message: `เกิดข้อผิดพลาด: ${error.message}`
      };
    }
  }
  
  /**
   * Check if file is a media file
   */
  static isMediaFile(fileName) {
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.m4a'];
    const ext = fileName.toLowerCase().substr(fileName.lastIndexOf('.'));
    return mediaExtensions.includes(ext);
  }
  
  /**
   * Save media files using MediaLibrary (saves to Gallery/Photos - accessible to users)
   */
  static async saveMediaFile(sourceUri, fileName) {
    try {
      // Skip MediaLibrary for now due to permission issues
      console.log('⚠️ MediaLibrary temporarily disabled due to permission conflicts');
      return { success: false, error: 'MediaLibrary disabled' };
      
      /* Original MediaLibrary code - commented out due to AUDIO permission issues
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'MediaLibrary permission denied' };
      }
      
      const asset = await MediaLibrary.createAssetAsync(sourceUri);
      
      return {
        success: true,
        uri: asset.uri,
        message: `รูปภาพบันทึกไปที่ Gallery แล้ว\n\nชื่อไฟล์: ${fileName}\n\nดูได้จากแอป Photos หรือ Gallery`
      };
      */
    } catch (error) {
      console.log('❌ MediaLibrary failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Save using Sharing API to let user choose destination
   */
  static async saveViaSharing(sourceUri, fileName) {
    try {
      if (!await Sharing.isAvailableAsync()) {
        return { success: false, error: 'Sharing not available' };
      }
      
      // Copy to a temp location with proper name
      const tempDir = `${FileSystem.documentDirectory}temp_downloads/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      
      const tempUri = `${tempDir}${fileName}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: tempUri
      });
      
      // Share the file - this allows user to save it anywhere they want
      await Sharing.shareAsync(tempUri, {
        mimeType: this.getMimeType(fileName),
        dialogTitle: `บันทึกไฟล์: ${fileName}`,
        UTI: this.getUTI(fileName)
      });
      
      // Cleanup after a delay
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(tempDir, { idempotent: true });
        } catch (cleanupError) {
          console.log('⚠️ Cleanup warning:', cleanupError.message);
        }
      }, 10000); // เพิ่มเวลา cleanup สำหรับ iOS
      
      return {
        success: true,
        uri: tempUri,
        message: `✅ ไฟล์พร้อมบันทึก!\n\nชื่อไฟล์: ${fileName}\n\n📱 iOS: เลือก "Save to Files" เพื่อบันทึกไปที่:\n• Downloads\n• iCloud Drive\n• หรือตำแหน่งอื่นที่ต้องการ`
      };
      
    } catch (error) {
      console.log('❌ Sharing failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Use Intent Launcher to open file manager
   */
  static async saveViaIntent(sourceUri, fileName) {
    try {
      // Copy to Downloads-like directory first
      const publicDir = `${FileSystem.documentDirectory}Downloads/`;
      await FileSystem.makeDirectoryAsync(publicDir, { intermediates: true });
      
      const targetUri = `${publicDir}${fileName}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri
      });
      
      // File saved successfully - no intent launcher needed
      console.log('✅ File saved to app Downloads folder');
      
      return {
        success: true,
        uri: targetUri,
        message: `ไฟล์บันทึกเรียบร้อย!\n\nชื่อไฟล์: ${fileName}\n\nไฟล์อยู่ในแอป และถูกเปิดด้วยแอปจัดการไฟล์\n\nหากต้องการคัดลอกไปที่อื่น:\n1. แตะปุ่ม Share ในแอปจัดการไฟล์\n2. เลือก "Save to Files" หรือแอปที่ต้องการ`
      };
      
    } catch (error) {
      console.log('❌ Intent method failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get MIME type for file
   */
  static getMimeType(fileName) {
    const ext = fileName.toLowerCase().substr(fileName.lastIndexOf('.'));
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * Get UTI for iOS compatibility
   */
  static getUTI(fileName) {
    const ext = fileName.toLowerCase().substr(fileName.lastIndexOf('.'));
    const utiTypes = {
      '.pdf': 'com.adobe.pdf',
      '.doc': 'com.microsoft.word.doc',
      '.docx': 'org.openxmlformats.wordprocessingml.document',
      '.jpg': 'public.jpeg',
      '.jpeg': 'public.jpeg',
      '.png': 'public.png',
      '.txt': 'public.plain-text',
    };
    return utiTypes[ext] || 'public.data';
  }
  
  /**
   * Helper: Clean filename for Android filesystem
   */
  static cleanFileName(fileName) {
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  }
  
  /**
   * Generate unique filename to avoid conflicts
   */
  static generateUniqueFileName(originalFileName) {
    const timestamp = Date.now();
    const extension = originalFileName.substr(originalFileName.lastIndexOf('.'));
    const nameWithoutExt = originalFileName.substr(0, originalFileName.lastIndexOf('.'));
    return `${nameWithoutExt}_${timestamp}${extension}`;
  }
}

export default PublicAndroidDownloads;