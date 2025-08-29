import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

const LoadingModal = ({ visible, message, progress = 0 }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    let interval;
    if (visible) {
      interval = setInterval(() => {
        setDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
      setDots('');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="small" color="#FFA500" />
          <Text style={styles.message}>{message}{dots}</Text>
          {progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.sm + 4,
    alignItems: 'center',
    minWidth: 160,
    maxWidth: 250,
    ...SHADOWS.lg,
  },
  message: {
    marginTop: SPACING.sm + 4,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA500',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});

export default LoadingModal;
