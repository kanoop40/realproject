import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const FileAttachment = ({ file }) => {
  const getFileIcon = (fileType) => {
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('pdf')) return 'document-text';
    return 'document';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TouchableOpacity
      onPress={() => {/* Handle file open */}}
      className="bg-white/10 rounded-lg p-2 mb-2"
    >
      <View className="flex-row items-center">
        <Icon 
          name={getFileIcon(file.file_type)} 
          size={24} 
          color="#fff" 
        />
        <View className="ml-2 flex-1">
          <Text 
            numberOfLines={1} 
            className="text-white"
          >
            {file.file_name}
          </Text>
          <Text className="text-white/70 text-xs">
            {formatFileSize(file.size)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default FileAttachment;