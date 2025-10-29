import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { PublicAndroidDownloads } from './publicAndroidDownloads';

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
      // NEW: Try public downloads first (user-accessible)
      console.log('🔄 Trying PUBLIC Downloads (user-accessible)...');
      
      // Method 1: Public Downloads (user can actually find these files)
      const publicResult = await PublicAndroidDownloads.saveToPublicDownloads(sourceUri, fileName);
      if (publicResult.success) {
        console.log('✅ Public Downloads method succeeded');
        return publicResult;
      }
      
      console.log('⚠️ Public Downloads failed, trying app folder fallback...');
      
      // Method 2: App Downloads folder (reliable fallback)
      const appResult = await this.saveViaAppDownloads(sourceUri, fileName);
      if (appResult.success) {
        console.log('✅ App Downloads method succeeded');
        // Enhance message with sharing option
        appResult.message += '\n\n💡 เพื่อความสะดวก:\nแตะไฟล์ → Share → Files เพื่อบันทึกไปที่ Downloads ที่เข้าถึงได้ง่าย';
        return appResult;
      }
      
      console.log('⚠️ App Downloads failed, trying FileSystem approach...');
      
      // Method 3: Try direct FileSystem copy to public Downloads
      const fsResult = await this.saveViaFileSystem(sourceUri, fileName);
      if (fsResult.success) {
        console.log('✅ FileSystem method succeeded');
        return fsResult;
      }
      
      console.log('⚠️ All methods failed, MediaLibrary disabled...');
      
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
   * Method 1: Use MediaLibrary to save to Downloads (DISABLED due to permission issues)
   */
  static async saveViaMediaLibrary(sourceUri, fileName) {
    try {
      console.log('📱 Trying MediaLibrary approach...');
      
      // TEMPORARY DISABLE: Skip MediaLibrary due to AUDIO permission issues
      console.log('⚠️ MediaLibrary disabled due to AUDIO permission conflicts');
      return { 
        success: false, 
        error: 'MediaLibrary disabled',
        message: 'MediaLibrary ปิดใช้งานชั่วคราวเนื่องจากปัญหาสิทธิ์เสียง จะใช้วิธีอื่นแทน'
      };
      
      // Original code commented out until permission issue is resolved
      /*
      // Check if MediaLibrary is available
      if (!MediaLibrary.requestPermissionsAsync) {
        console.log('❌ MediaLibrary not available');
        return { success: false, error: 'MediaLibrary not available' };
      }
      
      // Request permissions with specific writeOnly scope to avoid AUDIO permission issues
      let permissionResult;
      try {
        // Request only writeOnly permissions to avoid AUDIO permission requirement
        permissionResult = await MediaLibrary.requestPermissionsAsync(false); // false = writeOnly
      } catch (permError) {
        console.log('❌ Permission request failed:', permError.message);
        // If writeOnly fails, try without any parameters as fallback
        try {
          console.log('🔄 Trying basic permission request...');
          permissionResult = await MediaLibrary.getPermissionsAsync();
          if (permissionResult.status !== 'granted') {
            console.log('❌ Basic permission check failed, skipping MediaLibrary method');
            return { success: false, error: 'MediaLibrary permissions not available' };
          }
        } catch (basicError) {
          console.log('❌ All MediaLibrary permission methods failed:', basicError.message);
          return { success: false, error: 'Permission request failed completely' };
        }
      }
      
      if (permissionResult.status !== 'granted') {
        console.log('❌ MediaLibrary permission denied:', permissionResult.status);
        return { 
          success: false, 
          error: 'Permission denied',
          message: 'ไม่ได้รับสิทธิ์เข้าถึงสื่อ จะใช้วิธีสำรองในการบันทึกไฟล์'
        };
      }
      */
      
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
      
      // Try multiple public Downloads paths
      const downloadsPaths = [
        '/storage/emulated/0/Download/',
        '/sdcard/Download/',
        '/storage/sdcard0/Download/'
      ];
      
      let lastError = null;
      
      for (const downloadsPath of downloadsPaths) {
        try {
          const targetUri = downloadsPath + safeFileName;
          console.log('📁 Attempting copy to:', targetUri);
          
          await FileSystem.copyAsync({
            from: sourceUri,
            to: targetUri
          });
          
          // Verify file was created
          const fileInfo = await FileSystem.getInfoAsync(targetUri);
          if (fileInfo.exists && fileInfo.size > 0) {
            console.log('✅ FileSystem copy completed successfully');
            return { 
              success: true, 
              uri: targetUri,
              message: `ไฟล์ถูกบันทึกไปที่ Downloads แล้ว\n\nชื่อไฟล์: ${safeFileName}\n\nเข้าถึงได้จากแอปจัดการไฟล์ → Downloads`
            };
          } else {
            throw new Error('File was created but appears to be empty or invalid');
          }
          
        } catch (pathError) {
          console.log(`❌ Path ${downloadsPath} failed:`, pathError.message);
          lastError = pathError;
          continue;
        }
      }
      
      throw new Error(`All Downloads paths failed. Last error: ${lastError?.message}`);
      
      
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
      console.log('📱 Using app Downloads folder (most reliable method)...');
      
      const safeFileName = this.cleanFileName(fileName);
      const appDownloadsDir = `${FileSystem.documentDirectory}Downloads/`;
      const targetUri = `${appDownloadsDir}${safeFileName}`;
      
      console.log('📁 App Downloads path:', targetUri);
      
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
      
      console.log('📋 File copy details:', {
        from: sourceUri,
        to: targetUri,
        fileName: safeFileName,
        directory: appDownloadsDir
      });
      
      // Copy file to app Downloads folder
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
        console.log('✅ App Downloads file creation verified:', { 
          exists: fileInfo.exists, 
          size: fileInfo.size 
        });
      } catch (verifyError) {
        console.warn('⚠️ Could not verify file info:', verifyError.message);
        // Don't fail the operation - file might still be valid
      }
      
      return { 
        success: true, 
        uri: targetUri,
        message: `ไฟล์ดาวน์โหลดสำเร็จ!\n\nชื่อไฟล์: ${safeFileName}\n\nไฟล์ถูกบันทึกในแอป\nเข้าถึงได้ผ่านแอปจัดการไฟล์ → Android/data/com.kanoop60.chatappnew/files/Downloads/\n\nหรือใช้แอปค้นหาไฟล์ค้นหา: "${safeFileName}"`
      };
      
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

    // Check MediaLibrary permissions safely
    try {
      if (capabilities.hasMediaLibrary) {
        // Use getPermissionsAsync to avoid requesting unnecessary permissions
        const permission = await MediaLibrary.getPermissionsAsync();
        capabilities.mediaLibraryPermission = permission.status;
      }
    } catch (error) {
      console.log('⚠️ MediaLibrary permission check failed:', error.message);
      capabilities.mediaLibraryError = error.message;
      capabilities.hasMediaLibrary = false; // Disable if checking fails
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