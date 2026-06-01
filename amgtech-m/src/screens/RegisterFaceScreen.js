import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import {
  ArrowLeft,
  ScanFace,
  CircleDot,
  CheckCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import Api from '../utils/Api';
import Storage from '../utils/Storage';

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width * 0.7;

function normalizeUri(path) {
  return path?.startsWith('file://') ? path : `file://${path}`;
}

export default function RegisterFaceScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [faceDetected, setFaceDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [captureCount, setCaptureCount] = useState(0); // simpan 3 foto
  const profileRef = useRef(null);

  const REQUIRED_CAPTURES = 3;

  useEffect(() => {
    Storage.getProfile().then(p => {
      console.log('=== PROFILE DATA ===', JSON.stringify(p));
      profileRef.current = Array.isArray(p) ? p[0] : p; // Pastikan mengambil objek pertama jika p adalah array
    });
    requestPermission();
  }, []);

  const faceDetector = useFaceDetector({
    performanceMode: 'fast',
    classificationMode: 'none',
  });

  const updateDetected = Worklets.createRunOnJS(
    useCallback(detected => setFaceDetected(detected), []),
  );

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const faces = faceDetector.detectFaces(frame);
      updateDetected(faces.length > 0);
    },
    [faceDetector, updateDetected],
  );

  const handleCapture = async () => {
    if (!faceDetected || isCapturing) return;
    const profile = profileRef.current;
    if (!profile?.userid) {
      Alert.alert('Error', 'Data profil tidak ditemukan.');
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });

      const resized = await ImageResizer.createResizedImage(
        normalizeUri(photo.path),
        800,
        800,
        'JPEG',
        80,
      );

      const result = await Api.registerFace(
        String(profile.userid),
        resized.uri,
      );

      if (result.success === true || result.success === 'true') {
        const newCount = captureCount + 1;
        setCaptureCount(newCount);

        if (newCount >= REQUIRED_CAPTURES) {
          setIsDone(true);
          Alert.alert(
            'Pendaftaran Wajah Berhasil!',
            `${REQUIRED_CAPTURES} foto wajah kamu telah tersimpan. Sekarang kamu bisa absen menggunakan wajah.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
        }
      } else {
        Alert.alert('Gagal', result.pesan || 'Gagal mendaftarkan wajah.');
      }
    } catch (err) {
      console.warn('[RegisterFace] Error:', err);
      Alert.alert('Error', 'Gagal terhubung ke server.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!hasPermission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#111827',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 36,
        }}
      >
        <ScanFace size={64} color="#6366f1" style={{ marginBottom: 24 }} />
        <Text
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: '800',
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          Izin Kamera Diperlukan
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: '#6366f1',
            paddingHorizontal: 40,
            paddingVertical: 16,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            Izinkan Kamera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const borderColor = isDone ? '#22c55e' : faceDetected ? '#3b82f6' : '#e5e7eb';

  const progress = Math.min(captureCount / REQUIRED_CAPTURES, 1);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
          Daftarkan Wajah
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}>
        {/* Instruksi */}
        <View
          style={{
            backgroundColor: '#eff6ff',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: '#bfdbfe',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: '#1d4ed8',
              marginBottom: 4,
            }}
          >
            Petunjuk Pendaftaran
          </Text>
          <Text style={{ fontSize: 12, color: '#3b82f6', lineHeight: 18 }}>
            • Pastikan wajah terlihat jelas dan pencahayaan cukup{'\n'}• Ambil{' '}
            {REQUIRED_CAPTURES} foto dari sedikit sudut berbeda{'\n'}• Foto
            dipakai untuk verifikasi saat absen
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>
              Foto tersimpan
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>
              {captureCount} / {REQUIRED_CAPTURES}
            </Text>
          </View>
          <View
            style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 }}
          >
            <View
              style={{
                height: 8,
                backgroundColor: '#3b82f6',
                borderRadius: 4,
                width: `${progress * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Kamera */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: CAMERA_SIZE,
              height: CAMERA_SIZE,
              borderRadius: CAMERA_SIZE / 2,
              borderWidth: 4,
              borderColor,
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
            }}
          >
            {device && (
              <Camera
                ref={cameraRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                device={device}
                isActive={!isDone}
                photo
                pixelFormat="yuv"
                frameProcessor={frameProcessor}
              />
            )}
            {isCapturing && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
            {isDone && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(21,128,61,0.7)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle size={64} color="#fff" />
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
            }}
          >
            <CircleDot size={14} color={faceDetected ? '#22c55e' : '#d1d5db'} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: faceDetected ? '#15803d' : '#9ca3af',
              }}
            >
              {faceDetected ? 'Wajah terdeteksi' : 'Arahkan wajah ke kamera'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tombol ambil foto */}
      <View
        style={{ paddingHorizontal: 20, paddingBottom: 44, paddingTop: 12 }}
      >
        <TouchableOpacity
          disabled={!faceDetected || isCapturing || isDone}
          onPress={handleCapture}
          activeOpacity={0.85}
          style={{
            height: 60,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: faceDetected && !isDone ? '#3b82f6' : '#f3f4f6',
          }}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: faceDetected && !isDone ? '#fff' : '#9ca3af',
              }}
            >
              {isDone
                ? '✓ Pendaftaran Selesai'
                : faceDetected
                ? `Ambil Foto (${captureCount}/${REQUIRED_CAPTURES})`
                : 'Arahkan Wajah Dulu'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
