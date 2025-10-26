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
      // Method 1: Try MediaLibrary approach
      const mediaResult = await this.saveViaMediaLibrary(sourceUri, fileName);
      if (mediaResult.success) {
        return mediaResult;
      }
      
      console.log('⚠️ MediaLibrary failed, trying FileSystem approach...');
      
      // Method 2: Try FileSystem SAF approach
      const fsResult = await this.saveViaFileSystem(sourceUri, fileName);
      if (fsResult.success) {
        return fsResult;
      }
      
      console.log('⚠️ Both methods failed, using fallback...');
      
      // Method 3: Fallback - copy to app Downloads folder
      return await this.saveViaAppDownloads(sourceUri, fileName);
      
    } catch (error) {
      console.error('❌ Error saving to Downloads:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 1: Use MediaLibrary to save to Downloads
   */
  static async saveViaMediaLibrary(sourceUri, fileName) {
    try {
      console.log('📱 Trying MediaLibrary approach...');
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ MediaLibrary permission denied');
        return { success: false, error: 'Permission denied' };
      }
      
      // Create asset from file
      const asset = await MediaLibrary.createAssetAsync(sourceUri);
      console.log('✅ Asset created:', asset);
      
      // Try to get or create Downloads album
      let downloadsAlbum;
      try {
        const albums = await MediaLibrary.getAlbumsAsync();
        downloadsAlbum = albums.find(album => album.title === 'Downloads' || album.title === 'Download');
        
        if (!downloadsAlbum) {
          console.log('📁 Creating Downloads album...');
          downloadsAlbum = await MediaLibrary.createAlbumAsync('Downloads', asset, false);
        } else {
          console.log('📁 Adding to existing Downloads album...');
          await MediaLibrary.addAssetsToAlbumAsync([asset], downloadsAlbum, false);
        }
      } catch (albumError) {
        console.log('⚠️ Album creation failed, but asset created:', albumError.message);
      }
      
      return { 
        success: true, 
        uri: asset.uri,
        message: `ไฟล์ถูกบันทึกไปที่ Downloads แล้ว\nชื่อไฟล์: ${fileName}`
      };
      
    } catch (error) {
      console.log('❌ MediaLibrary approach failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 2: Use FileSystem with SAF (Storage Access Framework)
   */
  static async saveViaFileSystem(sourceUri, fileName) {
    try {
      console.log('📂 Trying FileSystem SAF approach...');
      
      // Try to access Android's Downloads directory
      // This works on some Android versions
      const downloadsDir = FileSystem.StorageAccessFramework?.getUriForDirectoryInRoot?.('Downloads');
      
      if (!downloadsDir) {
        console.log('❌ SAF Downloads access not available');
        return { success: false, error: 'SAF not available' };
      }
      
      const targetUri = `${downloadsDir}/${fileName}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri
      });
      
      return { 
        success: true, 
        uri: targetUri,
        message: `ไฟล์ถูกบันทึกไปที่ Downloads แล้ว\nชื่อไฟล์: ${fileName}`
      };
      
    } catch (error) {
      console.log('❌ FileSystem SAF approach failed:', error.message);
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
      const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
      }
      
      // Copy file to Downloads folder
      const targetUri = `${downloadsDir}${fileName}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetUri
      });
      
      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(targetUri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('File copy failed');
      }
      
      return { 
        success: true, 
        uri: targetUri,
        message: `ไฟล์ถูกบันทึกไปที่ App Downloads แล้ว\nชื่อไฟล์: ${fileName}\nขนาด: ${(fileInfo.size / 1024).toFixed(2)} KB\n\nตำแหน่ง: ${targetUri}`
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