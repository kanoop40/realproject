import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { AndroidDownloads } from '../utils/androidDownloads';

const AndroidDownloadTester = () => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const testDownloads = async () => {
    setTesting(true);
    try {
      console.log('🧪 Starting Android Downloads test...');
      
      // Create a test file
      const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test for Android Downloads functionality.`;
      const testFileName = `android-download-test-${Date.now()}.txt`;
      const tempUri = `${FileSystem.documentDirectory}${testFileName}`;
      
      console.log('📝 Creating test file...');
      await FileSystem.writeAsStringAsync(tempUri, testContent);
      
      // Test AndroidDownloads capability check
      console.log('🔍 Checking capabilities...');
      const capabilities = await AndroidDownloads.checkDownloadsCapabilities();
      console.log('📋 Capabilities:', capabilities);
      
      // Test actual download
      console.log('💾 Testing download...');
      const downloadResult = await AndroidDownloads.saveToDownloads(tempUri, testFileName);
      console.log('📊 Download result:', downloadResult);
      
      // Cleanup temp file
      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        console.log('🗑️ Cleanup completed');
      } catch (cleanupError) {
        console.log('⚠️ Cleanup failed:', cleanupError.message);
      }
      
      // Show result to user
      const resultMessage = downloadResult.success 
        ? `✅ ทดสอบสำเร็จ!\n\n${downloadResult.message}`
        : `❌ ทดสอบล้มเหลว\n\nError: ${downloadResult.error}`;
      
      Alert.alert(
        'ผลการทดสอบ Android Downloads',
        resultMessage,
        [{ text: 'ตกลง' }]
      );
      
      setLastResult(downloadResult);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      Alert.alert(
        'เกิดข้อผิดพลาด',
        `การทดสอบล้มเหลว: ${error.message}`,
        [{ text: 'ตกลง' }]
      );
      setLastResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const checkCapabilities = async () => {
    try {
      const capabilities = await AndroidDownloads.checkDownloadsCapabilities();
      
      let message = `ระบบปฏิบัติการ: ${capabilities.isAndroid ? 'Android' : 'ไม่ใช่ Android'}\n`;
      message += `MediaLibrary: ${capabilities.hasMediaLibrary ? 'มี' : 'ไม่มี'}\n`;
      message += `Storage Access Framework: ${capabilities.hasSAF ? 'มี' : 'ไม่มี'}\n`;
      
      if (capabilities.mediaLibraryPermission) {
        message += `สิทธิ์ MediaLibrary: ${capabilities.mediaLibraryPermission}\n`;
      }
      
      if (capabilities.mediaLibraryError) {
        message += `ข้อผิดพลาด: ${capabilities.mediaLibraryError}\n`;
      }
      
      message += `\n${capabilities.message}`;
      
      Alert.alert(
        'ความสามารถของระบบ',
        message,
        [{ text: 'ตกลง' }]
      );
      
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', `ไม่สามารถตรวจสอบความสามารถได้: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Android Downloads Tester</Text>
      
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={testDownloads}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? '🧪 กำลังทดสอบ...' : '🧪 ทดสอบการดาวน์โหลด'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={checkCapabilities}>
        <Text style={styles.buttonText}>🔍 ตรวจสอบความสามารถ</Text>
      </TouchableOpacity>
      
      {lastResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>ผลล่าสุด:</Text>
          <Text style={[styles.resultText, lastResult.success ? styles.success : styles.error]}>
            {lastResult.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}
          </Text>
          {lastResult.message && (
            <Text style={styles.resultMessage}>{lastResult.message}</Text>
          )}
          {lastResult.error && (
            <Text style={styles.errorText}>Error: {lastResult.error}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
  resultMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#ff3333',
    marginTop: 5,
  },
  success: {
    color: '#00AA00',
  },
  error: {
    color: '#ff3333',
  },
});

export default AndroidDownloadTester;