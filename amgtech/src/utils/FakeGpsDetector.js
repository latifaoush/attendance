import { NativeModules, Alert } from 'react-native';

const { FakeGpsModule } = NativeModules;

export async function validateFakeGps() {
  try {
    if (!FakeGpsModule) {
      console.warn('FakeGpsModule tidak tersedia');
      return true; // jangan block kalau module belum terpasang
    }

    const [apps, mockLocation, developerMode] = await Promise.all([
      FakeGpsModule.detectFakeGpsApps(),
      FakeGpsModule.isMockLocationEnabled(), 
      FakeGpsModule.isDeveloperModeEnabled(),
    ]);

    console.log('Fake GPS Apps:', apps);
    console.log('Mock Location:', mockLocation);
    console.log('Developer Mode:', developerMode);
    console.log('__DEV__:', __DEV__);

    if (apps && apps.length > 0) {
      Alert.alert(
        'Fake GPS Terdeteksi',
        'Nonaktifkan aplikasi fake GPS terlebih dahulu.',
      );
      return false;
    }

    if (mockLocation) {
      Alert.alert(
        'Mock Location Aktif',
        'Matikan mock location di developer options.',
      );
      return false;
    }

    if (!__DEV__ && developerMode) {
      Alert.alert(
        'Developer Mode Aktif',
        'Matikan developer mode sebelum presensi.',
      );
      return false;
    }

    return true;

  } catch (e) {
    console.log('VALIDATE FAKE GPS ERROR:', e);
    return true;
  }
}