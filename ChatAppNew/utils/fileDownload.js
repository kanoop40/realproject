import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../service/api';
import { Platform } from 'react-native';

/**
 * Enhanced URL generator for better PDF download success rate
 * @param {string} originalUrl - The original file URL
 * @returns {Array<string>} - Array of URLs to try
 */
const generateEnhancedDownloadUrls = (originalUrl) => {
  console.log('🔧 Generating enhanced URLs for:', originalUrl);
  console.log('📱 Platform:', Platform.OS);
  
  // If not Cloudinary, return original
  if (!originalUrl.includes('cloudinary.com')) {
    return [originalUrl];
  }

  const baseUrl = originalUrl.replace(/\/fl_[^\/]+/g, ''); // Remove existing flags
  
  // Extract Cloudinary parts
  const cloudinaryMatch = baseUrl.match(/https:\/\/res\.cloudinary\.com\/([^\/]+)\/([^\/]+)\/upload\/(.+)/);
  
  if (!cloudinaryMatch) {
    return [originalUrl];
  }
  
  const [, cloudName, resourceType, pathAndFile] = cloudinaryMatch;
  const basePath = `https://res.cloudinary.com/${cloudName}`;
  
  // Platform-specific URL prioritization
  let urls = [];
  
  if (Platform.OS === 'android') {
    console.log('📱 Optimizing URLs for Android...');
    urls = [
      // Android works better with these approaches
      `${API_URL}/api/files/proxy?fileUrl=${encodeURIComponent(originalUrl)}`,
      `${basePath}/image/upload/fl_attachment,fl_force_strip/${pathAndFile}`,
      `${basePath}/raw/upload/${pathAndFile}`,
      baseUrl,
      `${basePath}/image/upload/fl_attachment/${pathAndFile}`,
      `${basePath}/image/upload/f_auto/${pathAndFile}`
    ];
  } else {
    console.log('📱 Optimizing URLs for iOS...');
    urls = [
      // iOS works well with raw uploads
      `${basePath}/raw/upload/${pathAndFile}`,
      `${basePath}/image/upload/fl_attachment,fl_force_strip/${pathAndFile}`,
      baseUrl,
      `${basePath}/image/upload/fl_attachment/${pathAndFile}`,
      `${basePath}/image/upload/f_auto/${pathAndFile}`,
      `${API_URL}/api/files/proxy?fileUrl=${encodeURIComponent(originalUrl)}`
    ];
  }

  console.log('🔗 Enhanced URLs generated:', urls.length, 'variations');
  return urls;
};

/**
 * Get enhanced download URLs for files
 * @param {string} fileUrl - The original file URL
 * @param {string} fileName - The file name (optional)
 * @returns {Promise<Array<string>>} - Array of URLs to try
 */
export const getFileDownloadUrl = async (fileUrl, fileName = null) => {
  try {
    console.log('🔗 Getting enhanced download URLs for:', fileUrl);
    
    // Generate enhanced URLs
    const urls = generateEnhancedDownloadUrls(fileUrl);
    console.log('📋 Enhanced URLs to try:', urls);
    
    return urls;
  } catch (error) {
    console.error('❌ Error generating download URLs:', error);
    // Fallback to original URL
    return [fileUrl];
  }
};

/**
 * Enhanced download function with multiple URL attempts and better success rate
 * @param {string} fileUrl - The file URL to download
 * @param {string} fileName - The file name
 * @param {Function} downloadFunction - The actual download function to use
 * @returns {Promise<object>} - The download result
 */
export const downloadFileWithFallback = async (fileUrl, fileName, downloadFunction) => {
  console.log('📥 Starting enhanced download with fallback system...');
  
  let lastError = null;
  
  // Get enhanced URLs to try
  const urlsToTry = await getFileDownloadUrl(fileUrl, fileName);
  console.log('🔗 Will try', urlsToTry.length, 'different URLs');
  
  // Try each URL until one succeeds
  for (let i = 0; i < urlsToTry.length; i++) {
    const tryUrl = urlsToTry[i];
    console.log(`🔄 Enhanced attempt ${i + 1}/${urlsToTry.length}:`, tryUrl.substring(0, 80) + '...');
    
    try {
      console.log('🔄 Trying URL:', tryUrl);
      const result = await downloadFunction(tryUrl, fileName);
      
      // Enhanced validation for download success
      const isValidDownload = result && 
        result.success !== false && 
        result.status !== 404 &&
        result.headers &&
        result.headers['content-length'] !== '0' &&
        !result.headers['x-cld-error'];
      
      if (isValidDownload) {
        console.log(`✅ Enhanced download succeeded on attempt ${i + 1}!`);
        console.log('📊 Download result:', JSON.stringify({
          attemptNumber: i + 1,
          result: {
            headers: result.headers,
            status: result.status,
            uri: result.uri
          },
          success: true,
          successUrl: tryUrl
        }));
        return {
          success: true,
          result,
          attemptNumber: i + 1,
          successUrl: tryUrl
        };
      } else {
        // Check specific failure reasons
        let failureReason = 'Unknown error';
        if (result?.status === 404) {
          failureReason = 'File not found (404)';
        } else if (result?.headers && result.headers['content-length'] === '0') {
          failureReason = 'Empty file (0 bytes)';
        } else if (result?.headers && result.headers['x-cld-error']) {
          failureReason = `Cloudinary error: ${result.headers['x-cld-error']}`;
        } else if (!result) {
          failureReason = 'No result returned';
        }
        
        console.log(`⚠️ Enhanced attempt ${i + 1} failed: ${failureReason}`);
        console.log('📊 Failed result details:', {
          status: result?.status,
          contentLength: result?.headers?.['content-length'],
          cloudinaryError: result?.headers?.['x-cld-error'],
          hasResult: !!result
        });
        
        lastError = new Error(failureReason);
      }
    } catch (error) {
      console.log(`⚠️ Enhanced attempt ${i + 1} error:`, error.message);
      lastError = error;
      
      // Continue to next URL
      continue;
    }
  }
  
  // If all attempts failed, throw the last error
  console.error('❌ All enhanced download attempts failed');
  throw lastError || new Error('All enhanced download attempts failed');
};

export default downloadFileWithFallback;