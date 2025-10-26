import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../service/api';

/**
 * Enhanced URL generator for better PDF download success rate
 * @param {string} originalUrl - The original file URL
 * @returns {Array<string>} - Array of URLs to try
 */
const generateEnhancedDownloadUrls = (originalUrl) => {
  console.log('� Generating enhanced URLs for:', originalUrl);
  
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
  
  // Generate multiple URL variations with high success probability
  const urls = [
    // Method 1: Try as raw file first (best for PDFs)
    `${basePath}/raw/upload/${pathAndFile}`,
    
    // Method 2: Try with attachment and strip flags
    `${basePath}/image/upload/fl_attachment,fl_force_strip/${pathAndFile}`,
    
    // Method 3: Try original without flags
    baseUrl,
    
    // Method 4: Try with just attachment flag
    `${basePath}/image/upload/fl_attachment/${pathAndFile}`,
    
    // Method 5: Try with auto format
    `${basePath}/image/upload/f_auto/${pathAndFile}`,
    
    // Method 6: Backend proxy as last resort
    `${API_URL}/api/files/proxy?fileUrl=${encodeURIComponent(originalUrl)}`
  ];

  console.log('🔗 Enhanced URLs generated:', urls.length, 'variations');
  return urls;
};

/**
 * Get a proper download URL for files, with enhanced fallback system
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
      const result = await downloadFunction(tryUrl, fileName);
      
      if (result && result.success !== false) {
        console.log(`✅ Enhanced download succeeded on attempt ${i + 1}!`);
        return {
          success: true,
          result,
          attemptNumber: i + 1,
          successUrl: tryUrl
        };
      } else {
        console.log(`⚠️ Enhanced attempt ${i + 1} failed:`, result?.error || 'Unknown error');
        lastError = new Error(result?.error || `Attempt ${i + 1} failed`);
      }
    } catch (error) {
      console.log(`⚠️ Enhanced attempt ${i + 1} error:`, error.message);
      lastError = error;
      
      // Continue to next URL
      continue;
    }
  }
    
    // Try with server-generated download URL
    try {
      const serverUrl = await getFileDownloadUrl(cleanUrl, fileName);
      if (serverUrl !== cleanUrl) {
        urlsToTry.unshift(serverUrl); // Add to beginning of array
      }
    } catch (serverError) {
      console.log('⚠️ Could not get download URL from server:', serverError.message);
    }
    
    // Try the clean original URL
    if (cleanUrl !== fileUrl) {
      urlsToTry.push(cleanUrl);
    }
    
    // For PDF files, try converting from /image/upload/ to /raw/upload/
    const isPDFFile = fileName && fileName.toLowerCase().includes('.pdf');
    if (isPDFFile && cleanUrl.includes('/image/upload/')) {
      const rawUrl = cleanUrl.replace('/image/upload/', '/raw/upload/');
      urlsToTry.push(rawUrl);
      console.log('📄 Added PDF raw URL to try:', rawUrl);
    }
    
    // Try with simple attachment flag (only if it's not an image)
    const isImageFile = fileName && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
    if (!isImageFile) {
      const attachmentUrl = cleanUrl.replace('/upload/', '/upload/fl_attachment/');
      urlsToTry.push(attachmentUrl);
    }
    
    // Add proxy URL as final fallback (no auth required now)
    try {
      const proxyUrl = `${API_URL}/api/files/proxy?fileUrl=${encodeURIComponent(cleanUrl)}`;
      urlsToTry.push(proxyUrl);
      console.log('🔗 Added proxy URL as fallback');
    } catch (proxyError) {
      console.log('⚠️ Could not create proxy URL:', proxyError.message);
    }
  }
  
  console.log('📋 URLs to try:', urlsToTry);
  
  for (let i = 0; i < urlsToTry.length; i++) {
    const currentUrl = urlsToTry[i];
    console.log(`🔄 Attempt ${i + 1}/${urlsToTry.length} with URL:`, currentUrl);
    
    try {
      const result = await downloadFunction(currentUrl);
      
      if (result && result.status === 200) {
        console.log(`✅ Download successful on attempt ${i + 1}`);
        return result;
      } else if (result) {
        console.log(`⚠️ Attempt ${i + 1} failed with status:`, result.status);
        lastError = new Error(`HTTP ${result.status}`);
      }
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed:`, error.message);
      lastError = error;
    }
  }
  
  // If all attempts failed, throw the last error
  console.error('❌ All enhanced download attempts failed');
  throw lastError || new Error('All enhanced download attempts failed');
};

export default downloadFileWithFallback;