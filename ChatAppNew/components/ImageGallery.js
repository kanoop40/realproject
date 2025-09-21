import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  StyleSheet
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width: screenWidth } = Dimensions.get('window');

const ImageGallery = ({ images, onClose, visible, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!images || images.length === 0) {
    return null;
  }

  // Convert images to the format expected by ImageViewer
  const imageUrls = images.map(image => ({
    url: image.uri || image.url || image
  }));

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <ImageViewer
        imageUrls={imageUrls}
        index={currentIndex}
        onCancel={onClose}
        enableSwipeDown={true}
        onChange={(index) => setCurrentIndex(index)}
        renderHeader={() => (
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
        renderFooter={() => (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              เลื่อนซ้าย-ขวาเพื่อดูรูปอื่น • ปิดนิ้วเพื่อซูม
            </Text>
          </View>
        )}
        backgroundColor="rgba(0,0,0,0.9)"
        enablePreload={true}
        saveToLocalByLongPress={false}
        menuContext={{
          saveToLocal: 'บันทึกรูปภาพ',
          cancel: 'ยกเลิก'
        }}
      />
    </Modal>
  );
};

// Grid component for showing thumbnail previews
export const ImageGrid = ({ images, onImagePress, maxDisplay = 4 }) => {
  if (!images || images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const getGridLayout = (count) => {
    if (count === 1) return { rows: 1, cols: 1 };
    if (count === 2) return { rows: 1, cols: 2 };
    if (count === 3) return { rows: 2, cols: 2 }; // 2 on top, 1 on bottom
    return { rows: 2, cols: 2 }; // 2x2 grid
  };

  const { rows, cols } = getGridLayout(displayImages.length);
  const imageSize = (screenWidth - 60) / cols; // Account for margins

  const renderGridItem = (image, index) => {
    const isLastItem = index === displayImages.length - 1 && remainingCount > 0;
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.gridItem,
          {
            width: imageSize,
            height: imageSize,
            marginRight: index % cols === cols - 1 ? 0 : 4,
            marginBottom: Math.floor(index / cols) === rows - 1 ? 0 : 4
          }
        ]}
        onPress={() => onImagePress(index)}
      >
        <Image
          source={{ uri: image.uri || image.url || image }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        
        {isLastItem && (
          <View style={styles.moreOverlay}>
            <Text style={styles.moreText}>+{remainingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.gridContainer}>
      <View style={styles.grid}>
        {displayImages.map((image, index) => renderGridItem(image, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  footerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gridContainer: {
    marginVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ImageGallery;