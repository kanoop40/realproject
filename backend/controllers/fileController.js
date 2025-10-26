const asyncHandler = require('express-async-handler');
const { cloudinary, getDownloadUrl } = require('../config/cloudinary');
const axios = require('axios');

// @desc    Get a signed download URL for Cloudinary files
// @route   POST /api/files/download-url
// @access  Private
const getFileDownloadUrl = asyncHandler(async (req, res) => {
    try {
        const { fileUrl, fileName } = req.body;

        if (!fileUrl) {
            return res.status(400).json({
                success: false,
                message: 'File URL is required'
            });
        }

        // Check if it's a Cloudinary URL
        if (!fileUrl.includes('cloudinary.com')) {
            return res.json({
                success: true,
                downloadUrl: fileUrl, // Return original URL for non-Cloudinary files
                message: 'Non-Cloudinary file, using original URL'
            });
        }

        try {
            // Extract public_id from Cloudinary URL more carefully
            let cleanUrl = fileUrl;
            
            // Remove any existing transformations or flags
            if (cleanUrl.includes('/fl_attachment/')) {
                cleanUrl = cleanUrl.replace('/fl_attachment/', '/');
            }
            
            const urlParts = cleanUrl.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            
            if (uploadIndex === -1) {
                throw new Error('Invalid Cloudinary URL format');
            }

            // Get everything after /upload/ including version
            const afterUpload = urlParts.slice(uploadIndex + 1);
            
            // Join all parts to create full public_id (including version)
            const fullPath = afterUpload.join('/');
            // Remove file extension but keep the path structure
            const publicId = fullPath.replace(/\.[^/.]+$/, '');

            console.log('🔍 Extracted public_id:', publicId);

            console.log('🔍 Extracted public_id:', publicId);

            // Handle different file types and URL structures
            let downloadUrl;
            
            if (fileUrl.includes('.pdf')) {
                if (fileUrl.includes('/image/upload/')) {
                    // Legacy PDF files uploaded as image - try both raw and image URLs
                    downloadUrl = fileUrl; // Keep original for now, will try raw in fallback
                    console.log('📄 Legacy PDF file - will try multiple URLs');
                } else if (fileUrl.includes('/raw/upload/')) {
                    // Correctly uploaded PDF files
                    downloadUrl = fileUrl;
                    console.log('📄 PDF file - using raw URL:', downloadUrl);
                } else {
                    // Generate proper raw URL
                    downloadUrl = cloudinary.url(publicId, {
                        resource_type: 'raw',
                        type: 'upload',
                        secure: true
                    });
                    console.log('📄 Generated PDF raw URL:', downloadUrl);
                }
            } else {
                // For other files, use the original URL
                downloadUrl = fileUrl;
                console.log('📁 Non-PDF file - using original URL:', downloadUrl);
            }

            console.log('✅ Generated download URL:', downloadUrl);

            res.json({
                success: true,
                downloadUrl: downloadUrl,
                originalUrl: fileUrl,
                publicId: publicId,
                message: 'Download URL generated successfully'
            });

        } catch (urlError) {
            console.error('❌ Error processing Cloudinary URL:', urlError);
            
            // Fallback: return original URL with attachment flag
            const fallbackUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
            
            res.json({
                success: true,
                downloadUrl: fallbackUrl,
                originalUrl: fileUrl,
                message: 'Using fallback URL with attachment flag'
            });
        }

    } catch (error) {
        console.error('❌ Error in getFileDownloadUrl:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating download URL',
            error: error.message
        });
    }
});

// @desc    Proxy file download through our server (fallback method)
// @route   GET /api/files/proxy
// @access  Public
const proxyFileDownload = asyncHandler(async (req, res) => {
    try {
        const { fileUrl } = req.query;
        
        // Add CORS headers for mobile app
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        console.log('🌐 Proxy request received:', {
            fileUrl,
            query: req.query,
            headers: req.headers
        });
        
        if (!fileUrl) {
            console.log('❌ No fileUrl provided in query');
            return res.status(400).json({
                success: false,
                message: 'File URL is required as query parameter'
            });
        }

        console.log('🔄 Proxying file download for:', fileUrl);

        // Simple approach: just try multiple URL variations directly
        console.log('🔗 Cloudinary file detected - will try multiple URL formats');        // Fallback: try regular URLs if Cloudinary API didn't work
        const urlsToTry = [fileUrl];
        
        if (fileUrl.includes('cloudinary.com')) {
            // Try converting image/upload to raw/upload
            const rawUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
            if (rawUrl !== fileUrl) {
                urlsToTry.push(rawUrl);
            }
            
            // Try with fl_attachment flag
            const attachmentUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
            if (attachmentUrl !== fileUrl) {
                urlsToTry.push(attachmentUrl);
            }
        }

        console.log('🔗 Proxy URLs to try:', urlsToTry);

        let response = null;
        let lastError = null;

        // Try each URL until one works
        for (let i = 0; i < urlsToTry.length; i++) {
            const tryUrl = urlsToTry[i];
            console.log(`🔄 Proxy attempt ${i + 1}/${urlsToTry.length}: ${tryUrl}`);
            
            try {
                response = await axios({
                    method: 'GET',
                    url: tryUrl,
                    responseType: 'stream',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'ChatApp-Proxy/1.0'
                    }
                });
                
                console.log(`✅ Proxy success with URL ${i + 1}`);
                break; // Success, exit loop
                
            } catch (error) {
                lastError = error;
                console.log(`⚠️ Proxy attempt ${i + 1} failed:`, error.response?.status || error.message);
                
                if (i === urlsToTry.length - 1) {
                    // Last attempt failed, throw error
                    throw error;
                }
            }
        }

        // Set appropriate headers
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Length', response.headers['content-length'] || '0');
        res.setHeader('Content-Disposition', 'attachment');

        // Stream the file
        response.data.pipe(res);

    } catch (error) {
        console.error('❌ Error proxying file download:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to download file',
            error: error.message
        });
    }
});

module.exports = {
    getFileDownloadUrl,
    proxyFileDownload
};