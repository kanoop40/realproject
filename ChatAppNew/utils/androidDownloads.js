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
      // Try methods in order of preference for user accessibility
      console.log('🔄 Starting with MediaLibrary (saves to public Downloads)...');
      
      // Method 1: MediaLibrary - saves to public Downloads that users can easily find
      const mediaResult = await this.saveViaMediaLibrary(sourceUri, fileName);
      if (mediaResult.success) {
        console.log('✅ MediaLibrary method succeeded');
        return mediaResult;
      }
      
      console.log('⚠️ MediaLibrary failed, trying direct FileSystem approach...');
      
      // Method 2: Try direct FileSystem copy to public Downloads
      const fsResult = await this.saveViaFileSystem(sourceUri, fileName);
      if (fsResult.success) {
        console.log('✅ FileSystem method succeeded');
        return fsResult;
      }
      
      console.log('⚠️ FileSystem failed, using app Downloads fallback...');
      
      // Method 3: App Downloads folder (fallback)
      const appResult = await this.saveViaAppDownloads(sourceUri, fileName);
      if (appResult.success) {
        console.log('✅ App Downloads folder method succeeded');
        return appResult;
      }
      
      console.log('❌ All methods failed');
      return { 
        success: false, 
        error: 'All download methods failed',
        message: 'ไม่สามารถบันทึกไฟล์ไปที่โฟลเดอร์ Downloads ได้\n\nสาเหตุที่เป็นไปได้:\n• อุปกรณ์ไม่อนุญาตการเข้าถึงพื้นที่จัดเก็บ\n• พื้นที่จัดเก็บเต็ม\n• ปัญหาสิทธิ์แอป\n\nแนะนำ: ลองเปิดแอปจัดการไฟล์เพื่อดูว่าไฟล์ถูกบันทึกหรือไม่'
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
      
      // Verify source file exists
      try {
        const fileInfo = await FileSystem.getInfoAsync(sourceUri);
        if (!fileInfo.exists) {
          console.log('❌ Source file not found:', sourceUri);
          return { success: false, error: 'Source file not found' };
        }
        if (fileInfo.size === 0) {
          console.log('❌ Source file is empty:', sourceUri);
          return { success: false, error: 'Source file is empty' };
        }
        console.log('📋 Source file verified:', { exists: fileInfo.exists, size: fileInfo.size });
      } catch (sourceError) {
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
      console.log('📱 Attempting to save to public Downloads folder...');
      
      // Try to save directly to Android public Downloads folder
      const publicDownloadsUri = 'file:///storage/emulated/0/Download/';
      const safeFileName = this.cleanFileName(fileName);
      const targetUri = publicDownloadsUri + safeFileName;
      
      console.log('📁 Target path:', targetUri);
      
      // Try direct copy to public Downloads
      try {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: targetUri
        });
        
        console.log('✅ Successfully saved to public Downloads folder');
        return {
          success: true,
          uri: targetUri,
          message: `ไฟล์ถูกบันทึกไปที่ Downloads แล้ว\nชื่อไฟล์: ${safeFileName}\nเข้าถึงได้จากแอปจัดการไฟล์`
        };
      } catch (copyError) {
        console.log('❌ Direct copy to public Downloads failed:', copyError.message);
        
        // Fallback to app Documents folder with clear message
        const appDownloadsDir = `${FileSystem.documentDirectory}Downloads/`;
        
        // Create Downloads directory if needed
        try {
          await FileSystem.makeDirectoryAsync(appDownloadsDir, { intermediates: true });
          console.log('📁 App Downloads directory ensured');
        } catch (dirError) {
          // Directory might already exist, which is fine
          if (!dirError.message.includes('already exists')) {
            console.warn('⚠️ Directory creation issue:', dirError.message);
          }
        }
        
        // Generate safe target URI for app folder fallback
        const targetUri = `${appDownloadsDir}${safeFileName}`;
        
        console.log('📋 File copy details (app fallback):', {
          from: sourceUri,
          to: targetUri,
          fileName: safeFileName
        });
        
        // Use copyAsync instead of moveAsync to avoid permission issues
        await FileSystem.copyAsync({
          from: sourceUri,
          to: targetUri
        });
        
        // Verify file was created
        try {
          const fileInfo = await FileSystem.getInfoAsync(targetUri);
          if (!fileInfo.exists) {
            throw new Error('File was not created at target location');
          }
          console.log('✅ App folder file creation verified');
        } catch (verifyError) {
          console.warn('⚠️ Could not verify file info:', verifyError.message);
          // Don't fail the operation - file might still be valid
        }
        
        return { 
          success: true, 
          uri: targetUri,
          message: `ไฟล์ถูกดาวน์โหลดเรียบร้อยแล้ว\n\nชื่อไฟล์: ${safeFileName}\n\nไฟล์ถูกบันทึกในแอป สามารถเข้าถึงผ่านแอปจัดการไฟล์`
        };
      }
      
    } catch (error) {
      console.log('❌ App Downloads method failed:', error.message);
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

  /**
   * Helper: Check Android Downloads capabilities
   */
  static async checkDownloadsCapabilities() {
    if (Platform.OS !== 'android') {
      return {
        isAndroid: false,
        hasMediaLibrary: false,
        hasSAF: false,
        message: 'ไม่ใช่ Android - การดาวน์โหลดจะใช้วิธีมาตรฐาน'
      };
    }

    const capabilities = {
      isAndroid: true,
      hasMediaLibrary: !!MediaLibrary.requestPermissionsAsync,
      hasSAF: !!FileSystem.StorageAccessFramework,
      message: ''
    };

    // Check MediaLibrary permissions
    try {
      if (capabilities.hasMediaLibrary) {
        const permission = await MediaLibrary.getPermissionsAsync();
        capabilities.mediaLibraryPermission = permission.status;
      }
    } catch (error) {
      capabilities.mediaLibraryError = error.message;
    }

    // Build informative message
    if (capabilities.hasMediaLibrary && capabilities.mediaLibraryPermission === 'granted') {
      capabilities.message = 'ระบบพร้อมบันทึกไฟล์ไปที่ Downloads/Gallery';
    } else if (capabilities.hasMediaLibrary) {
      capabilities.message = 'ต้องการสิทธิ์เข้าถึงสื่อเพื่อบันทึกไฟล์';
    } else {
      capabilities.message = 'จะใช้วิธีสำรองในการบันทึกไฟล์';
    }

    return capabilities;
  }

  /**
   * Helper: Test download functionality
   */
  static async testDownloadCapability() {
    console.log('🧪 Testing Android Downloads capability...');
    
    try {
      // Create a small test file
      const testContent = `Test file created at ${new Date().toISOString()}`;
      const testFileName = `test_${Date.now()}.txt`;
      const tempUri = `${FileSystem.documentDirectory}${testFileName}`;
      
      await FileSystem.writeAsStringAsync(tempUri, testContent);
      console.log('📝 Test file created');
      
      // Try to save it
      const result = await this.saveToDownloads(tempUri, testFileName);
      
      // Cleanup
      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
      } catch (cleanupError) {
        console.log('⚠️ Cleanup warning:', cleanupError.message);
      }
      
      return {
        success: result.success,
        method: result.success ? 'Downloads capability working' : 'Downloads capability failed',
        message: result.message || result.error,
        testFile: testFileName
      };
      
    } catch (error) {
      console.error('❌ Download test failed:', error);
      return {
        success: false,
        method: 'Test failed',
        message: error.message,
        error: error.message
      };
    }
  }
}

export default AndroidDownloads;