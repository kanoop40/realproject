import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../service/api';

/**
 * Get a proper download URL for files, especially for Cloudinary files
 * @param {string} fileUrl - The original file URL
 * @param {string} fileName - The file name (optional)
 * @returns {Promise<string>} - The download URL
 */
export const getFileDownloadUrl = async (fileUrl, fileName = null) => {
  try {
    console.log('🔗 Getting download URL for:', fileUrl);
    
    // If it's not a Cloudinary URL, return as is
    if (!fileUrl.includes('cloudinary.com')) {
      return fileUrl;
    }

    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      console.log('⚠️ No token found, using original URL');
      return fileUrl;
    }

    const response = await fetch(`${API_URL}/api/files/download-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileUrl,
        fileName,
      }),
    });

    const data = await response.json();

    if (data.success && data.downloadUrl) {
      console.log('✅ Got download URL from server:', data.downloadUrl);
      return data.downloadUrl;
    } else {
      console.log('⚠️ Server did not provide download URL, using original');
      return fileUrl;
    }
  } catch (error) {
    console.error('❌ Error getting download URL:', error);
    // Fallback to original URL
    return fileUrl;
  }
};

/**
 * Download file with proper error handling and fallback URLs
 * @param {string} fileUrl - The file URL to download
 * @param {string} fileName - The file name
 * @param {Function} downloadFunction - The actual download function to use
 * @returns {Promise<object>} - The download result
 */
export const downloadFileWithFallback = async (fileUrl, fileName, downloadFunction) => {
  const maxRetries = 3;
  let lastError = null;
  
  // List of URLs to try in order
  const urlsToTry = [
    fileUrl, // Original URL
  ];
  
  // For Cloudinary URLs, add variations
  if (fileUrl.includes('cloudinary.com')) {
    // Clean the URL first to avoid double processing
    let cleanUrl = fileUrl;
    
    // Remove any existing fl_attachment to start clean
    if (cleanUrl.includes('/fl_attachment/')) {
      cleanUrl = cleanUrl.replace('/fl_attachment/', '/');
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
  throw lastError || new Error('All download attempts failed');
};