// Theme colors for the app
export const COLORS = {
  // Primary colors
  primary: '#000000',      // Pure black for primary elements
  primaryLight: '#333333', // Dark gray for secondary elements
  primaryDark: '#000000',  // Pure black for emphasis
  
  // Background colors
  background: '#FFFFFF',   // Pure white background
  backgroundSecondary: '#F8F9FA', // Light gray for cards/sections
  backgroundTertiary: '#F5F5F5',  // Slightly darker for subtle sections
  
  // Text colors
  textPrimary: '#000000',    // Black text for high contrast
  textSecondary: '#6C757D',  // Gray text for secondary information
  textTertiary: '#9E9E9E',   // Light gray for subtle text
  textInverse: '#FFFFFF',    // White text for dark backgrounds
  
  // Accent colors
  accent: '#007AFF',       // Keep iOS blue for links/actions
  accentLight: '#E3F2FD',  // Light blue background
  
  // Status colors
  success: '#28A745',      // Green for success states
  warning: '#FFC107',      // Yellow for warnings
  error: '#DC3545',        // Red for errors
  info: '#17A2B8',         // Teal for info
  
  // UI Element colors
  border: '#E9ECEF',       // Light gray borders
  borderSecondary: '#DEE2E6', // Slightly darker borders
  shadow: 'rgba(0, 0, 0, 0.1)', // Subtle shadows
  
  // Chat specific colors
  myMessage: '#000000',        // Black for my messages
  otherMessage: '#F8F9FA',     // Light gray for other messages
  messageText: '#FFFFFF',      // White text on my messages
  messageTextOther: '#000000', // Black text on other messages
  
  // Online status
  online: '#28A745',
  offline: '#6C757D',
  
  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
};

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// Border radius
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
};
