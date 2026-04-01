// App.tsx
import React, { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
// import './global.css';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    requestPermission();
    getFcmToken();
    foregroundListener();
  }, []);

  // Minta izin notifikasi (penting di Android 13+)
  const requestPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission enabled:', authStatus);
    } else {
      console.log('Notification permission not granted');
    }
  };

  // Dapatkan FCM Token perangkat
  const getFcmToken = async () => {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    // simpan token ke server kamu kalau perlu
  };

  // Listener ketika aplikasi lagi terbuka (foreground)
  const foregroundListener = () => {
    console.log('tes 1');
    messaging().onMessage(async remoteMessage => {
      console.log('tes 2');
      console.log('Message received in Foreground:', remoteMessage);
      // tampilkan alert/custom toast di sini jika mau
    });
  };

  return <AppNavigator />;
}
