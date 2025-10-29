import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';

/**
 * Android Downloads folder utility
 * Handles saving files to Android public Downloads folder
 */
export class AndroidDownloads {
  
  /**
   * Save file to Android Downloads folder
   * @param {string} sourceUri - Source file URI (can be temp file)
   * @param {string} fileName - Desired file name
   * @returns {Promise<{success: boolean, uri?: string, error?: string}>}
   */
  static async saveToDownloads(sourceUri, fileName) {
    if (Platform.OS !== 'android') {
      return { success: false, error: 'Not Android platform' };
    }

    console.log('📁 Attempting to save to Android Downloads:', fileName);
    
    try {
      // Always start with the most reliable method first
      console.log('🔄 Starting with app Downloads folder (most reliable)...');
      
      // Method 1: App Downloads folder (most reliable)
      const appResult = await this.saveViaAppDownloads(sourceUri, fileName);
      if (appResult.success) {
        console.log('✅ App Downloads folder method succeeded');
        return appResult;
      }
      
      console.log('⚠️ App Downloads failed, trying MediaLibrary...');
      
      // Method 2: Try MediaLibrary approach
      const mediaResult = await this.saveViaMediaLibrary(sourceUri, fileName);
      if (mediaResult.success) {
        console.log('✅ MediaLibrary method succeeded');
        return mediaResult;
      }
      
      console.log('⚠️ MediaLibrary failed, trying FileSystem approach...');
      
      // Method 3: Try FileSystem SAF approach
      const fsResult = await this.saveViaFileSystem(sourceUri, fileName);
      if (fsResult.success) {
        console.log('✅ FileSystem method succeeded');
        return fsResult;
      }
      
      console.log('❌ All methods failed');
      return { 
        success: false, 
        error: 'All download methods failed',
        message: 'ไม่สามารถบันทึกไฟล์ไปที่ Downloads ได้ กรุณาลองใหม่อีกครั้ง'
      };
      
    } catch (error) {
      console.error('❌ Error saving to Downloads:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'เกิดข้อผิดพลาดในการบันทึกไฟล์: ' + error.message
      };
    }
  }

  /**
   * Method 1: Use MediaLibrary to save to Downloads
   */
  static async saveViaMediaLibrary(sourceUri, fileName) {
    try {
      console.log('📱 Trying MediaLibrary approach...');
      
      // Check if MediaLibrary is available
      if (!MediaLibrary.requestPermissionsAsync) {
        console.log('❌ MediaLibrary not available');
        return { success: false, error: 'MediaLibrary not available' };
      }
      
      // Request permissions with better error handling
      let permissionResult;
      try {
        permissionResult = await MediaLibrary.requestPermissionsAsync();
      } catch (permError) {
        console.log('❌ Permission request failed:', permError.message);
        return { success: false, error: 'Permission request failed' };
      }
      
      if (permissionResult.status !== 'granted') {
        console.log('❌ MediaLibrary permission denied:', permissionResult.status);
        return { success: false, error: 'Permission denied' };
      }
      
      // Verify source file exists (using alternative method)
      try {
        // Try to read first byte to verify file exists and has content
        await FileSystem.readAsStringAsync(sourceUri, { length: 1 });
        console.log('📋 Source file verified');
      } catch (sourceError) {
        if (sourceError.message.includes('No such file')) {
          console.log('❌ Source file not found:', sourceUri);
          return { success: false, error: 'Source file not found' };
        }
        console.log('⚠️ Could not verify source file, continuing anyway:', sourceError.message);
        // Continue anyway - file might still work
      }
      
      // Create asset from file
      const asset = await MediaLibrary.createAssetAsync(sourceUri);
      if (!asset || !asset.id) {
        throw new Error('Asset creation returned invalid result');
      }
      
      console.log('✅ Asset created:', {
        id: asset.id,
        filename: asset.filename,
        mediaType: asset.mediaType
      });
      
      // Don't worry about albums - just having the asset in MediaLibrary is enough
      // Many Android devices will show it in Downloads or Gallery automatically
      
      return { 
        success: true, 
        uri: asset.uri,
        assetId: asset.id,
        message: `ไฟล์ถูกบันทึกไปที่ Gallery เรียบร้อยแล้ว\n\nชื่อไฟล์: ${asset.filename || fileName}\n\nสามารถดูได้จาก:\n• แอป Gallery\n• แอป Photos\n• แอปจัดการไฟล์`
      };
      
    } catch (error) {
      console.log('❌ MediaLibrary approach failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 2: Use FileSystem with safer approach
   */
  static async saveViaFileSystem(sourceUri, fileName) {
    try {
      console.log('📂 Trying FileSystem SAF approach...');
      
      // Check if Storage Access Framework is available
      if (!FileSystem.StorageAccessFramework) {
        console.log('❌ StorageAccessFramework not available');
        return { success: false, error: 'SAF not available' };
      }
      
      const safeFileName = this.cleanFileName(fileName);
      console.log('📋 Using safe filename:', safeFileName);
      
      // Try basic file system copy to public Downloads
      // This is safer than using SAF which requires user interaction
      const publicDownloadsPath = '/storage/emulated/0/Download/';
      const targetUri = publicDownloadsPath + safeFileName;
      
      console.log('📁 Attempting copy to:', targetUri);
      
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri
      });
      
      console.log('✅ FileSystem copy completed');
      
      return { 
        success: true, 
        uri: targetUri,
        message: `ไฟล์ถูกบันทึกไปที่ Downloads แล้ว\nชื่อไฟล์: ${safeFileName}`
      };
      
    } catch (error) {
      console.log('❌ FileSystem approach failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 3: Fallback - Save to app-accessible Downloads folder
   */
  static async saveViaAppDownloads(sourceUri, fileName) {
    try {
      console.log('📱 Using app Downloads folder fallback...');
      
      const downloadsDir = `${FileSystem.documentDirectory}Downloads/`;
      
      // Create Downloads directory if needed
      try {
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
        console.log('📁 Downloads directory ensured');
      } catch (dirError) {
        // Directory might already exist, which is fine
        if (!dirError.message.includes('already exists')) {
          console.warn('⚠️ Directory creation issue:', dirError.message);
        }
      }
      
      // Generate safe target URI
      const safeFileName = this.cleanFileName(fileName);
      const targetUri = `${downloadsDir}${safeFileName}`;
      
      console.log('📋 File copy details:', {
        from: sourceUri,
        to: targetUri,
        fileName: safeFileName
      });
      
      // Use copyAsync instead of moveAsync to avoid permission issues
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri
      });
      
      // Verify file was created (with error handling)
      let fileSize = 0;
      try {
        // Use readAsStringAsync to verify file exists and get basic info
        // This avoids the deprecated getInfoAsync method
        await FileSystem.readAsStringAsync(targetUri, { length: 1 });
        // If we can read at least 1 byte, file exists
        console.log('✅ File creation verified');
      } catch (verifyError) {
        if (verifyError.message.includes('No such file')) {
          throw new Error('File was not created at target location');
        }
        console.warn('⚠️ Could not verify file info:', verifyError.message);
        // Don't fail the operation - file might still be valid
      }
      
      return { 
        success: true, 
        uri: targetUri,
        message: `ไฟล์ถูกดาวน์โหลดเรียบร้อยแล้ว\n\nชื่อไฟล์: ${safeFileName}\n\nไฟล์ถูกบันทึกในแอป สามารถเข้าถึงผ่าน:\n• แอปจัดการไฟล์\n• โฟลเดอร์ Downloads`
      };
      
    } catch (error) {
      console.log('❌ App Downloads fallback failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Generate unique filename with timestamp
   */
  static generateUniqueFileName(originalFileName) {
    const timestamp = Date.now();
    const lastDotIndex = originalFileName.lastIndexOf('.');
    
    if (lastDotIndex > 0) {
      const nameWithoutExt = originalFileName.substring(0, lastDotIndex);
      const extension = originalFileName.substring(lastDotIndex);
      return `${nameWithoutExt}_${timestamp}${extension}`;
    } else {
      return `${originalFileName}_${timestamp}`;
    }
  }

  /**
   * Helper: Clean filename for Android filesystem
   */
  static cleanFileName(fileName) {
    // Replace problematic characters for Android filesystem
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  }
}

export default AndroidDownloads;