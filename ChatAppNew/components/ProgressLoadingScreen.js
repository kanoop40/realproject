import React from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';

const ProgressLoadingScreen = ({ 
  isVisible = true, 
  progress = 0, 
  title = "กำลังโหลด...", 
  subtitle = "กรุณารอสักครู่",
  color = "#FFA500" 
}) => {
  const progressAnimation = React.useRef(new Animated.Value(progress / 100)).current;

  React.useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimation]);

  if (!isVisible) return null;

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={color} style={{ marginBottom: 10 }} />
      <Text style={[styles.loadingText, { color: color }]}>{title}</Text>
      
      {/* Progress Bar Container */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              {
                backgroundColor: color,
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: color }]}>
          {Math.round(progress)}%
        </Text>
      </View>
      
      <Text style={styles.loadingSubText}>{subtitle}</Text>
    </View>
  );
};

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
  },
  progressContainer: {
    width: '60%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
};

export default ProgressLoadingScreen;
