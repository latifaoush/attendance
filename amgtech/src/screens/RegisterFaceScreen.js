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

const FACE_STEPS = [
  { id: 0, label: 'Hadap Depan', description: 'Tatap lurus ke arah kamera' },
  {
    id: 1,
    label: 'Menoleh Kiri',
    description: 'Palingkan wajah sedikit ke kiri Anda',
  },
  {
    id: 2,
    label: 'Menoleh Kanan',
    description: 'Palingkan wajah sedikit ke kanan Anda',
  },
  {
    id: 3,
    label: 'Menghadap Atas',
    description: 'Dongakkan kepala sedikit ke atas',
  },
  {
    id: 4,
    label: 'Menghadap Bawah',
    description: 'Tundukkan kepala sedikit ke bawah',
  },
];

function normalizeUri(path) {
  return path?.startsWith('file://') ? path : `file://${path}`;
}

function getFaceValidationMessage(face, frameW, frameH, currentStep) {
  if (!face || !frameW || !frameH) return 'Arahkan wajah ke kamera';

  const { bounds, yawAngle, pitchAngle } = face;
  const faceRatio = bounds.width / frameW;

  if (faceRatio < 0.25) {
    return 'Wajah terlalu jauh, dekatkan ke kamera';
  }

  if (faceRatio > 0.75) {
    return 'Wajah terlalu dekat, jauhkan sedikit';
  }

  const faceCenterX = bounds.x + bounds.width / 2;
  const faceCenterY = bounds.y + bounds.height / 2;
  const isCentered =
    Math.abs(faceCenterX - frameW / 2) < frameW * 0.35 &&
    Math.abs(faceCenterY - frameH / 2) < frameH * 0.35;

  if (!isCentered) {
    return 'Posisikan wajah tepat di tengah lingkaran';
  }

  const looseMargin = -30;
  const isInsideFrame =
    bounds.x > looseMargin &&
    bounds.y > looseMargin &&
    bounds.x + bounds.width < frameW - looseMargin &&
    bounds.y + bounds.height < frameH - looseMargin;

  if (!isInsideFrame) {
    return 'Wajah terpotong, pastikan seluruh wajah terlihat';
  }

  switch (currentStep) {
    case 0:
      if (Math.abs(yawAngle) > 12 || Math.abs(pitchAngle) > 12) {
        return 'Pastikan wajah tegak lurus menghadap depan';
      }
      break;
    case 1:
      if (yawAngle < 12) return 'Kurang menoleh ke kiri';
      if (yawAngle > 35) return 'Terlalu menoleh ke kiri, tatap kamera sedikit';
      break;
    case 2:
      if (yawAngle > -12) return 'Kurang menoleh ke kanan';
      if (yawAngle < -35) return 'Terlalu menoleh ke kanan, tatap kamera sedikit';
      break;
    case 3:
      if (pitchAngle > 12) return 'Kurang mendongak ke atas';
      if (pitchAngle < -30) return 'Terlalu mendongak ke atas';
      break;
    case 4:
      if (pitchAngle < -12) return 'Kurang menunduk ke bawah';
      if (pitchAngle > 30) return 'Terlalu menunduk ke bawah';
      break;
    default:
      break;
  }

  return true;
}

export default function RegisterFaceScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [faceDetected, setFaceDetected] = useState(false);
  const [faceMessage, setFaceMessage] = useState('Arahkan wajah ke kamera');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const profileRef = useRef(null);
  const isProcessingCaptureRef = useRef(false);

  const REQUIRED_CAPTURES = FACE_STEPS.length;

  useEffect(() => {
    Storage.getProfile().then(p => {
      console.log('=== PROFILE DATA ===', JSON.stringify(p));
      profileRef.current = Array.isArray(p) ? p[0] : p;
    });
    requestPermission();
  }, []);

  const faceDetector = useFaceDetector({
    performanceMode: 'accurate',
    classificationMode: 'none',
  });

  const updateDetected = Worklets.createRunOnJS(
    useCallback((faces, frameW, frameH, step, capturing) => {
      if (isProcessingCaptureRef.current) return;

      if (faces.length === 0) {
        setFaceDetected(false);
        setFaceMessage('Wajah tidak terdeteksi');
        return;
      }

      const face = faces[0];
      const validation = getFaceValidationMessage(face, frameW, frameH, step);

      if (validation === true) {
        setFaceDetected(true);
        setFaceMessage(`Posisi bagus! Silakan ambil foto ${FACE_STEPS[step].label}`);
      } else {
        setFaceDetected(false);
        setFaceMessage(validation);
      }
    }, []),
  );

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (isProcessingCaptureRef.current) return;
      const faces = faceDetector.detectFaces(frame);
      updateDetected(faces, frame.width, frame.height, currentStep);
    },
    [faceDetector, updateDetected, currentStep],
  );

  const handleCapture = async () => {
    if (!faceDetected || isCapturing) return;
    const profile = profileRef.current;
    if (!profile?.userid) {
      Alert.alert('Error', 'Data profil tidak ditemukan.');
      return;
    }

    isProcessingCaptureRef.current = true;
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

      const result = await Api.registerFace(String(profile.userid), resized.uri);

      if (result.success === true || result.success === 'true') {
        const nextStep = currentStep + 1;
        if (nextStep >= REQUIRED_CAPTURES) {
          setIsDone(true);
          Alert.alert(
            'Pendaftaran Wajah Berhasil!',
            `${REQUIRED_CAPTURES} foto wajah kamu telah tersimpan.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
        } else {
          setCurrentStep(nextStep);
          setFaceDetected(false);
        }
      } else {
        Alert.alert('Gagal', result.pesan || 'Gagal mendaftarkan wajah.');
      }
    } catch (err) {
      console.warn('[RegisterFace] Error:', err);
      Alert.alert('Error', 'Gagal terhubung ke server.');
    } finally {
      setIsCapturing(false);
      isProcessingCaptureRef.current = false;
    }
  };

  if (!hasPermission) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-9">
        <ScanFace size={64} color="#6366f1" style={{ marginBottom: 24 }} />
        <Text className="text-white text-xl font-extrabold mb-3 text-center">
          Izin Kamera Diperlukan
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-indigo-500 px-10 py-4 rounded-2xl"
        >
          <Text className="text-white text-base font-bold">Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const borderColor = isDone ? '#22c55e' : faceDetected ? '#3b82f6' : '#ef4444';
  const progress = Math.min(currentStep / REQUIRED_CAPTURES, 1);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-[52px] pb-[14px] border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 items-center justify-center"
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-[15px] font-bold text-gray-900">
          Daftarkan Wajah
        </Text>
        <View className="w-9 h-9" />
      </View>

      <View className="flex-1 px-5 pt-6">
        {/* Step info card */}
        <View className="bg-green-50 rounded-2xl p-4 mb-6 border border-green-200 items-center">
          <Text className="text-[11px] font-bold text-green-600 uppercase mb-0.5 tracking-widest">
            LANGKAH {currentStep + 1} DARI {REQUIRED_CAPTURES}
          </Text>
          <Text className="text-lg font-extrabold text-green-900 mb-1">
            {isDone ? 'Selesai' : FACE_STEPS[currentStep]?.label}
          </Text>
          <Text className="text-[13px] text-green-700 text-center">
            {isDone
              ? 'Semua foto berhasil diambil'
              : FACE_STEPS[currentStep]?.description}
          </Text>
        </View>

        {/* Progress bar */}
        <View className="mb-5">
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs font-semibold text-blue-500">
              Progres Panduan
            </Text>
            <Text className="text-xs font-bold text-blue-500">
              {currentStep} / {REQUIRED_CAPTURES}
            </Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full">
            <View
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        </View>

        {/* Camera circle */}
        <View className="items-center mb-6">
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
              <View className="absolute inset-0 bg-black/45 items-center justify-center">
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
            {isDone && (
              <View className="absolute inset-0 bg-green-700/70 items-center justify-center">
                <CheckCircle size={64} color="#fff" />
              </View>
            )}
          </View>

          {/* Real-time notification text */}
          <View className="flex-row items-center gap-x-1.5 mt-3.5 px-5">
            <CircleDot size={14} color={faceDetected ? '#22c55e' : '#ef4444'} />
            <Text
              className={`text-[13px] font-semibold text-center ${
                faceDetected ? 'text-green-700' : 'text-red-500'
              }`}
            >
              {faceMessage}
            </Text>
          </View>
        </View>
      </View>

      {/* Capture button */}
      <View className="px-5 pb-11 pt-3">
        <TouchableOpacity
          disabled={!faceDetected || isCapturing || isDone}
          onPress={handleCapture}
          activeOpacity={0.85}
          className={`h-[60px] rounded-[18px] items-center justify-center ${
            faceDetected && !isDone ? 'bg-blue-500' : 'bg-gray-100'
          }`}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`text-base font-bold ${
                faceDetected && !isDone ? 'text-white' : 'text-gray-400'
              }`}
            >
              {isDone
                ? 'Pendaftaran Selesai'
                : faceDetected
                ? `Ambil Foto: ${FACE_STEPS[currentStep]?.label}`
                : 'Posisikan Wajah Sesuai Petunjuk'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}