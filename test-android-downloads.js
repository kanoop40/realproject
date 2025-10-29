// Test script for AndroidDownloads functionality
import * as FileSystem from 'expo-file-system';
import { AndroidDownloads } from './ChatAppNew/utils/androidDownloads';

async function testAndroidDownloads() {
  console.log('🧪 Testing AndroidDownloads functionality...');
  
  try {
    // Create a test file
    const testContent = 'This is a test file for Android Downloads functionality';
    const testFileName = `test-file-${Date.now()}.txt`;
    const tempUri = `${FileSystem.documentDirectory}${testFileName}`;
    
    console.log('📝 Creating test file:', testFileName);
    await FileSystem.writeAsStringAsync(tempUri, testContent);
    
    // Test the AndroidDownloads.saveToDownloads function
    console.log('📱 Testing AndroidDownloads.saveToDownloads...');
    const result = await AndroidDownloads.saveToDownloads(tempUri, testFileName);
    
    console.log('📋 Result:', result);
    
    if (result.success) {
      console.log('✅ AndroidDownloads test SUCCESS!');
      console.log('📁 File saved to:', result.uri);
      console.log('💬 Message:', result.message);
    } else {
      console.log('❌ AndroidDownloads test FAILED');
      console.log('🚫 Error:', result.error);
    }
    
    // Clean up
    try {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
      console.log('🗑️ Cleanup completed');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup failed:', cleanupError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAndroidDownloads();