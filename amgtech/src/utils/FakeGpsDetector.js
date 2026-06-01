import { isMockingLocation, MockLocationDetectorErrorCode } from 'react-native-turbo-mock-location-detector';
import JailMonkey from 'jail-monkey';
import { Alert } from 'react-native';

export async function validateFakeGps() {
  try {
    // Cek root / jailbreak
    if (JailMonkey.isJailBroken()) {
      Alert.alert(
        'Perangkat Rooted',
        'Perangkat terdeteksi telah di-root. Tidak dapat melakukan presensi.',
      );
      return false;
    }

    // Cek aplikasi fake GPS terinstall
    if (JailMonkey.canMockLocation()) {
      Alert.alert(
        'Fake GPS Terdeteksi',
        'Nonaktifkan atau uninstall aplikasi fake GPS terlebih dahulu.',
      );
      return false;
    }

    // Cek developer mode (skip saat development)
    if (!__DEV__) {
      const devMode = await JailMonkey.isDevelopmentSettingsMode();
      if (devMode) {
        Alert.alert(
          'Developer Mode Aktif',
          'Matikan developer mode sebelum melakukan presensi.',
        );
        return false;
      }
    }

    // Cek mock location aktif secara realtime
    const { isLocationMocked } = await isMockingLocation();
    if (isLocationMocked) {
      Alert.alert(
        'Mock Location Aktif',
        'Matikan mock location di developer options.',
      );
      return false;
    }

    return true;

  } catch (e) {
    // Handle error spesifik dari turbo-mock-location-detector
    if (e.code === MockLocationDetectorErrorCode.GPSNotEnabled) {
      Alert.alert('GPS Tidak Aktif', 'Aktifkan GPS/Location terlebih dahulu.');
      return false;
    }

    if (e.code === MockLocationDetectorErrorCode.NoLocationPermissionEnabled) {
      Alert.alert('Izin Lokasi', 'Berikan izin lokasi ke aplikasi.');
      return false;
    }

    // CantDetermine atau error lain — jangan block user
    console.warn('validateFakeGps error:', e);
    return true;
  }
}