const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { getFileDownloadUrl, proxyFileDownload } = require('../controllers/fileController');

// @route   POST /api/files/download-url
// @desc    Get a proper download URL for files
// @access  Private
router.post('/download-url', protect, getFileDownloadUrl);

// @route   GET /api/files/proxy
// @desc    Proxy file download through server (no auth required - fallback method)
// @access  Public
router.get('/proxy', proxyFileDownload);

// @route   GET /api/files/test-url
// @desc    Test URL generation for debugging
// @access  Private
router.get('/test-url', protect, async (req, res) => {
    const { url } = req.query;
    
    console.log('🧪 Testing URL:', url);
    
    try {
        const axios = require('axios');
        const response = await axios.head(url);
        
        res.json({
            success: true,
            status: response.status,
            headers: response.headers
        });
    } catch (error) {
        res.json({
            success: false,
            status: error.response?.status,
            message: error.message,
            headers: error.response?.headers
        });
    }
});

module.exports = router;