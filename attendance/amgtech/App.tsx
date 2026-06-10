// App.tsx
import React, { useEffect } from 'react';
import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import AppNavigator from './src/navigation/AppNavigator';
import './global.css';

export default function App() {
  useEffect(() => {
    handleRequestPermission();
    handleGetFcmToken();
    handleForegroundListener();
  }, []);

  const handleRequestPermission = async () => {
    try {
      const messaging = getMessaging();
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission enabled:', authStatus);
      } else {
        console.log('Notification permission not granted');
      }
    } catch (error) {
      console.log('Permission request error:', error);
    }
  };

  const handleGetFcmToken = async () => {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging);
      console.log('FCM Token:', token);
      // simpan token ke server kamu kalau perlu
    } catch (error) {
      console.log('FCM Token error:', error);
    }
  };

  const handleForegroundListener = () => {
    console.log('Foreground listener active');
    const messaging = getMessaging();
    const unsubscribe = onMessage(messaging, async remoteMessage => {
      console.log('Message received in Foreground:', remoteMessage);
      // tampilkan alert/custom toast di sini jika mau
    });

    return unsubscribe; // cleanup otomatis kalau dipakai di dalam useEffect return
  };

  return <AppNavigator />;
}