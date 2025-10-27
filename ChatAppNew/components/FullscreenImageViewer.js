import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  StatusBar
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FullscreenImageViewer = ({ 
  visible, 
  imageUri, 
  onClose,
  onDownload
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      // Entry animation - smooth scale up and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Exit animation - scale down and fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.7,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
      
      {/* Background overlay */}
      <Animated.View 
        style={[
          styles.background,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backgroundTouchable}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>
      
      {/* Content container */}
      <View style={styles.container}>
        {/* Header buttons */}
        <View style={styles.headerButtons}>
          {/* Download button */}
          {onDownload && (
            <Animated.View
              style={[
                styles.downloadButton,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: fadeAnim }]
                }
              ]}
            >
              <TouchableOpacity 
                onPress={onDownload}
                style={styles.headerButtonTouchable}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <View style={styles.headerButtonBackground}>
                  <Text style={styles.downloadButtonText}>📥</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Close button */}
          <Animated.View
            style={[
              styles.closeButton,
              {
                opacity: fadeAnim,
                transform: [{ scale: fadeAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.headerButtonTouchable}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={styles.headerButtonBackground}>
                <Text style={styles.closeButtonText}>✕</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Image container with smooth transition */}
        <View style={styles.imageContainer}>
          <Animated.View
            style={[
              styles.imageWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  backgroundTouchable: {
    flex: 1,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1001,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    marginRight: 10,
  },
  closeButton: {
    // No positioning needed since it's in flexDirection row
  },
  headerButtonTouchable: {
    padding: 8,
  },
  headerButtonBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: screenWidth,
    paddingHorizontal: 20,
  },
  imageWrapper: {
    width: '100%',
    maxHeight: screenHeight * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    maxWidth: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
  },
});

export default FullscreenImageViewer;