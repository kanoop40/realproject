import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ReadCount = ({ readCount, totalMembers, style, showIcon = true }) => {
  if (!readCount || readCount === 0) return null;

  const readPercentage = totalMembers > 0 ? (readCount / totalMembers) * 100 : 0;
  const isFullyRead = readCount === totalMembers;

  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <Text style={[styles.icon, isFullyRead && styles.iconRead]}>
          {isFullyRead ? '✓✓' : '✓'}
        </Text>
      )}
      <Text style={[styles.text, isFullyRead && styles.textRead]}>
        {readCount}/{totalMembers} อ่านแล้ว
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  icon: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  iconRead: {
    color: '#4CAF50',
  },
  text: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'Kanit-Regular',
  },
  textRead: {
    color: '#4CAF50',
  },
});

export default ReadCount;