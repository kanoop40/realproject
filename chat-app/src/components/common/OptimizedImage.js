import React, { useState, useCallback } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

const OptimizedImage = ({
  uri,
  style,
  className,
  resizeMode = 'cover',
  priority = 'normal'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const getPriority = () => {
    switch (priority) {
      case 'high':
        return FastImage.priority.high;
      case 'low':
        return FastImage.priority.low;
      default:
        return FastImage.priority.normal;
    }
  };

  if (error) {
    return (
      <View className={`bg-gray-200 justify-center items-center ${className}`}>
        <Image
          source={require('../../assets/icons/image-error.png')}
          className="w-8 h-8 opacity-50"
        />
      </View>
    );
  }

  return (
    <View className={className}>
      <FastImage
        source={{
          uri,
          priority: getPriority(),
          cache: FastImage.cacheControl.immutable
        }}
        style={style}
        resizeMode={
          resizeMode === 'cover' 
            ? FastImage.resizeMode.cover 
            : FastImage.resizeMode.contain
        }
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {loading && (
        <View className="absolute inset-0 justify-center items-center bg-gray-100">
          <ActivityIndicator size="small" color="#4B5563" />
        </View>
      )}
    </View>
  );
};

export default React.memo(OptimizedImage);