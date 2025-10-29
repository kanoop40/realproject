// Simple test for AndroidDownloads
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AndroidDownloads } from './ChatAppNew/utils/androidDownloads';

export const testAndroidDownloadsSimple = async () => {
  console.log('🧪 Starting simple AndroidDownloads test...');
  
  if (Platform.OS !== 'android') {
    console.log('⚠️ Not Android platform, skipping test');
    return { success: false, message: 'Not Android platform' };
  }
  
  try {
    // Create a simple test file
    const testContent = `Test file created: ${new Date().toISOString()}`;
    const testFileName = `test-download-${Date.now()}.txt`;
    const tempUri = `${FileSystem.documentDirectory}${testFileName}`;
    
    console.log('📝 Creating test file:', testFileName);
    await FileSystem.writeAsStringAsync(tempUri, testContent);
    
    // Test AndroidDownloads
    console.log('💾 Testing AndroidDownloads...');
    const result = await AndroidDownloads.saveToDownloads(tempUri, testFileName);
    
    // Cleanup
    try {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
      console.log('🗑️ Temp file cleaned up');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup warning:', cleanupError.message);
    }
    
    if (result.success) {
      console.log('✅ AndroidDownloads test SUCCESS!');
      console.log('📁 File saved to:', result.uri);
      console.log('💬 Message:', result.message);
      return {
        success: true,
        message: result.message,
        uri: result.uri,
        fileName: testFileName
      };
    } else {
      console.log('❌ AndroidDownloads test FAILED');
      console.log('🚫 Error:', result.error);
      return {
        success: false,
        message: result.error || 'Unknown error',
        error: result.error
      };
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      success: false,
      message: error.message,
      error: error.message
    };
  }
};

// Export for use in app
export default testAndroidDownloadsSimple;