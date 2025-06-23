import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    (async () => {
      // ขอสิทธิ์การเข้าถึงกล้องและคลังรูปภาพ
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        alert('Sorry, we need camera and media library permissions to make this work!');
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Welcome to Chat App!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});