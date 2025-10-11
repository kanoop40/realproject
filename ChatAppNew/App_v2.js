import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  console.log('ChatAppNew is starting...');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ChatAppNew</Text>
        <Text style={styles.subtitle}>Ready to build your chat app!</Text>
        <Text style={styles.status}>✅ Basic app structure working</Text>
        <Text style={styles.next}>Next: Add navigation & screens</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  status: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 10,
  },
  next: {
    fontSize: 14,
    color: '#3498db',
  },
});