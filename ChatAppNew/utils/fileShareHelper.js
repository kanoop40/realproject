import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { PublicAndroidDownloads } from './publicAndroidDownloads';

/**
 * Simple file sharing utility for easy access to Downloads
 */
export class FileShareHelper {
  
  /**
   * Download and offer sharing options to user
   */
  static async downloadAndShare(fileUrl, fileName, options = {}) {
    try {
      console.log('📥 Starting download and share for:', fileName);
      
      // Show loading if callback provided
      if (options.onStart) {
        options.onStart();
      }
      
      // Download file first
      const tempFileName = `temp_${Date.now()}_${fileName}`;
      const tempUri = `${FileSystem.documentDirectory}${tempFileName}`;
      
      console.log('🔄 Downloading file...');
      const downloadResult = await FileSystem.downloadAsync(fileUrl, tempUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed: HTTP ${downloadResult.status}`);
      }
      
      console.log('✅ File downloaded, offering share options...');
      
      // Hide loading if callback provided
      if (options.onComplete) {
        options.onComplete();
      }
      
      // Show action sheet with options
      this.showShareOptions(tempUri, fileName, options);
      
      return { success: true, tempUri };
      
    } catch (error) {
      console.error('❌ Download and share error:', error);
      
      if (options.onError) {
        options.onError(error);
      }
      
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถดาวน์โหลดไฟล์ได้: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Show share options to user
   */
  static showShareOptions(fileUri, fileName, options = {}) {
    const isAndroid = Platform.OS === 'android';
    const isIOS = Platform.OS === 'ios';
    
    if (isIOS) {
      // iOS: Direct sharing for easy save
      Alert.alert(
        'บันทึกไฟล์',
        `ไฟล์: ${fileName}\n\n📱 เลือก "Save to Files" เพื่อบันทึกไปที่ Downloads หรือตำแหน่งที่ต้องการ`,
        [
          { text: 'ยกเลิก', style: 'cancel', onPress: () => this.cleanup(fileUri) },
          {
            text: '📱 บันทึกไฟล์',
            onPress: () => this.saveToDownloads(fileUri, fileName),
            style: 'default'
          }
        ],
        { cancelable: true, onDismiss: () => this.cleanup(fileUri) }
      );
      return;
    }
    
    // Android: Multiple options
    const shareButtons = [
      {
        text: 'บันทึกไปที่ Downloads',
        onPress: () => this.saveToDownloads(fileUri, fileName)
      },
      {
        text: 'แชร์ไปแอปอื่น',
        onPress: () => this.shareToApp(fileUri, fileName)
      },
      {
        text: 'ยกเลิก',
        style: 'cancel',
        onPress: () => this.cleanup(fileUri)
      }
    ];
    
    // Add Android-specific option
    if (isAndroid) {
      shareButtons.unshift({
        text: 'เปิดด้วยแอปจัดการไฟล์',
        onPress: () => this.openWithFileManager(fileUri, fileName)
      });
    }
    
    Alert.alert(
      'เลือกการดำเนินการ',
      `ไฟล์: ${fileName}`,
      shareButtons,
      { cancelable: true, onDismiss: () => this.cleanup(fileUri) }
    );
  }
  
  /**
   * Save to Downloads using PublicAndroidDownloads
   */
  static async saveToDownloads(fileUri, fileName) {
    try {
      console.log('📁 Saving to Downloads...');
      
      if (Platform.OS === 'android') {
        const result = await PublicAndroidDownloads.saveToPublicDownloads(fileUri, fileName);
        
        if (result.success) {
          Alert.alert('สำเร็จ', result.message);
        } else {
          // If public downloads fails, try sharing as fallback
          Alert.alert(
            'ไม่สามารถบันทึกได้',
            `${result.message}\n\nจะเปิดตัวเลือกการแชร์แทน`,
            [
              { text: 'ยกเลิก' },
              { text: 'แชร์', onPress: () => this.shareToApp(fileUri, fileName) }
            ]
          );
        }
      } else {
        // iOS: Use PublicAndroidDownloads (which handles iOS sharing)
        const result = await PublicAndroidDownloads.saveToPublicDownloads(fileUri, fileName);
        
        if (result.success) {
          Alert.alert('✅ พร้อมบันทึก', result.message);
        } else {
          Alert.alert('ข้อผิดพลาด', `ไม่สามารถเตรียมไฟล์ได้: ${result.error}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Save to Downloads error:', error);
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถบันทึกได้: ${error.message}`);
    } finally {
      // Cleanup after delay
      setTimeout(() => this.cleanup(fileUri), 5000);
    }
  }
  
  /**
   * Share to other apps
   */
  static async shareToApp(fileUri, fileName) {
    try {
      console.log('📤 Sharing to apps...');
      
      if (!await Sharing.isAvailableAsync()) {
        throw new Error('การแชร์ไม่พร้อมใช้งาน');
      }
      
      await Sharing.shareAsync(fileUri, {
        mimeType: this.getMimeType(fileName),
        dialogTitle: `แชร์ไฟล์: ${fileName}`,
      });
      
      console.log('✅ File shared successfully');
      
      // Show tip for saving to Downloads
      setTimeout(() => {
        Alert.alert(
          'เคล็ดลับ',
          'หากต้องการบันทึกไปที่ Downloads:\n• เลือก "Files" หรือ "ตัวจัดการไฟล์"\n• เลือกโฟลเดอร์ Downloads\n• แตะ "บันทึก"',
          [{ text: 'เข้าใจแล้ว' }]
        );
      }, 1000);
      
    } catch (error) {
      console.error('❌ Share error:', error);
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถแชร์ได้: ${error.message}`);
    } finally {
      // Cleanup after delay
      setTimeout(() => this.cleanup(fileUri), 10000);
    }
  }
  
  /**
   * Open with file manager (Android)
   */
  static async openWithFileManager(fileUri, fileName) {
    try {
      console.log('📱 Opening with file manager...');
      
      // Try sharing with specific intent for file managers
      await Sharing.shareAsync(fileUri, {
        mimeType: this.getMimeType(fileName),
        dialogTitle: `เปิดด้วย: ${fileName}`,
      });
      
      // Show instruction
      Alert.alert(
        'เคล็ดลับ',
        'เลือกแอปจัดการไฟล์ เช่น:\n• Files by Google\n• My Files (Samsung)\n• File Manager\n\nจากนั้นสามารถย้ายไฟล์ไปยัง Downloads ได้',
        [{ text: 'เข้าใจแล้ว' }]
      );
      
    } catch (error) {
      console.error('❌ File manager error:', error);
      // Fallback to regular sharing
      this.shareToApp(fileUri, fileName);
    }
  }
  
  /**
   * Clean up temporary files
   */
  static async cleanup(fileUri) {
    try {
      if (fileUri && fileUri.includes('temp_')) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log('🗑️ Temporary file cleaned up');
      }
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
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
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export default FileShareHelper;