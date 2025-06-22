const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
  keyFilename: path.join(__dirname, '../../cloud-storage-key.json'),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);

const uploadToCloudStorage = async (file) => {
  try {
    const blob = bucket.file(`${Date.now()}-${file.originalname}`);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype
      }
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        reject(error);
      });

      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    throw new Error('Cloud Storage upload failed');
  }
};

const deleteFromCloudStorage = async (fileUrl) => {
  try {
    const fileName = fileUrl.split('/').pop();
    await bucket.file(fileName).delete();
  } catch (error) {
    throw new Error('Cloud Storage delete failed');
  }
};

module.exports = {
  uploadToCloudStorage,
  deleteFromCloudStorage
};