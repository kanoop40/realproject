const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Create storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app-avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [
      { width: 200, height: 200, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const userId = req.user?.id || 'unknown';
      return `avatar-${userId}-${timestamp}`;
    }
  }
});

// Create storage for group avatars
const groupAvatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app-group-avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [
      { width: 200, height: 200, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const groupId = req.params.groupId || 'unknown';
      return `group-avatar-${groupId}-${timestamp}`;
    }
  }
});

// Create storage for chat files
const fileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app-files',
    resource_type: 'auto', // Automatically detect file type
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1E9);
      return `file-${timestamp}-${randomNum}`;
    }
  }
});

// Helper function to delete old avatar
const deleteOldAvatar = async (publicId) => {
  try {
    if (publicId && !publicId.includes('default')) {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('🗑️ Old avatar deleted:', result);
      return result;
    }
  } catch (error) {
    console.error('❌ Error deleting old avatar:', error);
  }
};

// Helper function to get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    width: options.width || 200,
    height: options.height || 200,
    crop: 'fill',
    gravity: 'auto',
    ...options
  });
};

module.exports = {
  cloudinary,
  avatarStorage,
  groupAvatarStorage,
  fileStorage,
  deleteOldAvatar,
  getOptimizedUrl
};
