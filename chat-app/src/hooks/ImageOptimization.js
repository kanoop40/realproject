import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_IMAGE_SIZE = 1024; // Maximum dimension size
const COMPRESSION_QUALITY = 0.7; // Image compression quality

export const useImageOptimization = () => {
  const [processing, setProcessing] = useState(false);

  const optimizeImage = useCallback(async (imageUri) => {
    try {
      setProcessing(true);

      // Get image info
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const info = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { base64: true }
      );

      // Calculate new dimensions
      let width = info.width;
      let height = info.height;
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = Math.round((height / width) * MAX_IMAGE_SIZE);
          width = MAX_IMAGE_SIZE;
        } else {
          width = Math.round((width / height) * MAX_IMAGE_SIZE);
          height = MAX_IMAGE_SIZE;
        }
      }

      // Optimize image
      const optimizedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width, height } }],
        {
          compress: COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      return optimizedImage.uri;
    } catch (error) {
      console.error('Image optimization error:', error);
      return imageUri;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    optimizeImage,
    processing
  };
};