import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
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
  MapPin,
  ShieldCheck,
  CircleDot,
  ScanFace,
  Eye,
  Smile,
  ArrowRightCircle,
  ArrowLeftCircle,
  Briefcase,
  XCircle,
} from 'lucide-react-native';
import {
  useNavigation,
  useIsFocused,
  useFocusEffect,
} from '@react-navigation/native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import Api from '../utils/Api';
import Storage from '../utils/Storage';
import Geolocation from 'react-native-geolocation-service';
import { setBrightnessLevel } from '@reeq/react-native-device-brightness';

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width * 0.65;

const CHALLENGE_CONFIG = {
  blink: { label: 'Kedipkan Mata', icon: Eye, color: '#3b82f6' },
  smile: { label: 'Tersenyum', icon: Smile, color: '#10b981' },
  left: { label: 'Hadap Kiri', icon: ArrowLeftCircle, color: '#6366f1' },
  right: { label: 'Hadap Kanan', icon: ArrowRightCircle, color: '#f59e0b' },
};

const CHALLENGE_KEYS = Object.keys(CHALLENGE_CONFIG);
const RESIZE_FINAL = { width: 800, height: 800, quality: 70 };

function normalizeUri(path) {
  if (!path) return '';
  return path.startsWith('file://') ? path : `file://${path}`;
}

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function getFaceValidationMessage(bounds, frameW, frameH) {
  if (!bounds || !frameW || !frameH) return 'Arahkan wajah ke kamera';

  const faceRatio = bounds.width / frameW;

  if (faceRatio < 0.25) return 'Wajah terlalu jauh, dekatkan ke kamera';
  if (faceRatio > 0.8) return 'Wajah terlalu dekat, jauhkan sedikit';

  const faceCenterX = bounds.x + bounds.width / 2;
  const faceCenterY = bounds.y + bounds.height / 2;
  const isCentered =
    Math.abs(faceCenterX - frameW / 2) < frameW * 0.38 &&
    Math.abs(faceCenterY - frameH / 2) < frameH * 0.38;

  if (!isCentered) return 'Posisikan wajah tepat di tengah lingkaran';

  const looseMargin = -40;
  const isInsideFrame =
    bounds.x > looseMargin &&
    bounds.y > looseMargin &&
    bounds.x + bounds.width < frameW - looseMargin &&
    bounds.y + bounds.height < frameH - looseMargin;

  if (!isInsideFrame) return 'Wajah terpotong, pastikan seluruh wajah terlihat';

  return true;
}

function StepIndicator({ challenges, currentStep, completedSteps }) {
  return (
    <View className="flex-row justify-center gap-x-2.5 mb-5">
      {challenges.map((id, index) => {
        const isDone = completedSteps.has(id);
        const isActive = index === currentStep;
        const colorClass = isDone
          ? 'bg-green-500'
          : isActive
          ? 'bg-blue-500'
          : 'bg-gray-200';
        return (
          <View key={id} className={`h-2 w-9 rounded-full ${colorClass}`} />
        );
      })}
    </View>
  );
}

function ChallengeCard({ challengeId, isCapturing, stepIndex, total }) {
  const cfg = CHALLENGE_CONFIG[challengeId];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <View className="flex-row items-center">
      <View
        className="p-3 rounded-2xl"
        style={{ backgroundColor: cfg.color + '18' }}
      >
        <Icon size={28} color={cfg.color} />
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
          Langkah {stepIndex + 1} dari {total}
        </Text>
        <Text className="text-[17px] font-bold text-gray-900">{cfg.label}</Text>
        {isCapturing && (
          <Text className="text-[11px] font-medium text-yellow-500 mt-0.5">
            Menyimpan langkah...
          </Text>
        )}
      </View>
    </View>
  );
}

function VerifiedCard({ total }) {
  return (
    <View className="flex-row items-center">
      <View className="p-3 rounded-2xl bg-green-100">
        <ShieldCheck size={28} color="#16a34a" />
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-[17px] font-bold text-green-700">
          Wajah Terverifikasi ✓
        </Text>
        <Text className="text-[12px] text-green-500 mt-0.5">
          Semua {total} langkah berhasil divalidasi
        </Text>
      </View>
    </View>
  );
}

function VerifyingCard() {
  return (
    <View className="flex-row items-center">
      <View className="p-3 rounded-2xl bg-blue-50">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-[17px] font-bold text-blue-700">
          Memverifikasi Wajah...
        </Text>
        <Text className="text-[12px] text-blue-400 mt-0.5">
          Mencocokkan dengan data terdaftar
        </Text>
      </View>
    </View>
  );
}

function FailedCard() {
  return (
    <View className="flex-row items-center">
      <View className="p-3 rounded-2xl bg-red-50">
        <XCircle size={28} color="#ef4444" />
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-[17px] font-bold text-red-600">
          Verifikasi Gagal
        </Text>
        <Text className="text-[12px] text-red-400 mt-0.5">
          Wajah tidak cocok. Tekan ulangi.
        </Text>
      </View>
    </View>
  );
}

export default function FaceDetectionScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const cameraRef = useRef(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [showCamera, setShowCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [verifyState, setVerifyState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifiedPhotoUri, setVerifiedPhotoUri] = useState(null);

  const [faceMessage, setFaceMessage] = useState('Arahkan wajah ke kamera');
  const [facePresent, setFacePresent] = useState(false);

  const [faceStatus, setFaceStatus] = useState({
    detected: false,
    isSmiling: false,
    isBlinking: false,
    direction: 'center',
  });

  const [challenges, setChallenges] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const profileRef = useRef(null);
  const [user, setUser] = useState(null);
  const currentStepRef = useRef(0);
  const challengesRef = useRef([]);
  const isCapturingRef = useRef(false);
  const isFinishedRef = useRef(false);

  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    challengesRef.current = challenges;
  }, [challenges]);
  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);
  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  const getOneTimeLocation = useCallback((useHighAccuracy = true) => {
    return new Promise((resolve, reject) => {
      console.log('Membuka Watch GPS:', { useHighAccuracy });

      let watchId = null;

      const timer = setTimeout(
        () => {
          if (watchId !== null) {
            Geolocation.clearWatch(watchId);
            console.log('Watch GPS timeout manual dipicu.');

            if (useHighAccuracy) {
              console.log('Pindah ke Network via Watch Fallback...');
              getOneTimeLocation(false).then(resolve).catch(reject);
            } else {
              reject(new Error('TIMEOUT'));
            }
          }
        },
        useHighAccuracy ? 15000 : 10000,
      );

      watchId = Geolocation.watchPosition(
        position => {
          clearTimeout(timer);
          Geolocation.clearWatch(watchId);

          const isMocked =
            position.mocked || (position.coords && position.coords.mocked);
          const accuracy = position.coords.accuracy;

          if (isMocked) {
            console.log('PERINGATAN: Fake GPS Terdeteksi melalui flag mocked!');
            reject(new Error('FAKE_GPS_DETECTED'));
            return;
          }

          if (accuracy === 0) {
            console.log(
              'PERINGATAN: Akurasi mencurigakan (0). Kemungkinan Fake GPS.',
            );
            reject(new Error('SUSPICIOUS_ACCURACY'));
            return;
          }

          const currentLongitude = position.coords.longitude;
          const currentLatitude = position.coords.latitude;

          console.log('Watch Position Berhasil:', {
            currentLatitude,
            currentLongitude,
          });

          setLatitude(currentLatitude);
          setLongitude(currentLongitude);
          resolve({ latitude: currentLatitude, longitude: currentLongitude });
        },
        error => {
          clearTimeout(timer);
          Geolocation.clearWatch(watchId);
          console.log('Watch GPS Error:', error.code, error.message);

          if (error.code === 3 && useHighAccuracy) {
            getOneTimeLocation(false).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        },
        {
          enableHighAccuracy: useHighAccuracy,
          timeout: useHighAccuracy ? 15000 : 10000,
          maximumAge: useHighAccuracy ? 5000 : 30000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    });
  }, []);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const checkPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (!checkPermission) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Izin Akses Lokasi',
              message:
                'Aplikasi membutuhkan akses lokasi untuk mencatat posisi absensi',
              buttonPositive: 'OK',
              buttonNegative: 'Batal',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Info', 'Izin lokasi diperlukan untuk mencatat posisi');
            return null;
          }
        }

        return await getOneTimeLocation(true);
      } catch (err) {
        console.log('[Permission] Gagal mengambil lokasi:', err.message);
        return null;
      }
    } else {
      try {
        return await getOneTimeLocation(true);
      } catch (err) {
        return null;
      }
    }
  }, [getOneTimeLocation]);

  useFocusEffect(
    useCallback(() => {
      const turnUpBrightness = async () => {
        try {
          await setBrightnessLevel(1.0);
        } catch (e) {
          console.warn('Gagal menaikkan kecerahan:', e);
        }
      };
      turnUpBrightness();

      return () => {
        const resetBrightness = async () => {
          try {
            await setBrightnessLevel(0.5);
          } catch (e) {
            console.warn('Gagal mereset kecerahan saat meninggalkan layar:', e);
          }
        };
        resetBrightness();
      };
    }, []),
  );

  useEffect(() => {
    Storage.getProfile()
      .then(p => {
        const dataProfile = Array.isArray(p) ? p[0] : p;
        profileRef.current = dataProfile;
        setUser(dataProfile);
      })
      .catch(e => console.warn('[FaceDetection] Gagal load profile:', e));
  }, []);

  const openCamera = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setShowCamera(true);
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const shuffled = pickRandom(CHALLENGE_KEYS, 3);
    setChallenges(shuffled);
    openCamera();

    // requestLocationPermission().catch(err =>
    //   console.log('Init location error ignored:', err),
    // );
  }, [openCamera, requestLocationPermission]);

  useEffect(() => {
    if (isFocused) {
      setShowCamera(false);
      const timer = setTimeout(() => {
        setShowCamera(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setShowCamera(false);
    }
  }, [isFocused]);

  const resetFlow = useCallback(() => {
    const shuffled = pickRandom(CHALLENGE_KEYS, 3);
    setChallenges(shuffled);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsFinished(false);
    setVerifyState(null);
    setVerifiedPhotoUri(null);
    setFaceMessage('Arahkan wajah ke kamera');
    setShowCamera(false);
    setTimeout(() => setShowCamera(true), 800);
  }, []);

  const captureAndVerify = useCallback(async () => {
    const profile = profileRef.current;
    if (!profile?.userid) return;

    setVerifyState('verifying');

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });

      const rawUri = normalizeUri(photo.path);
      const resized = await ImageResizer.createResizedImage(
        rawUri,
        RESIZE_FINAL.width,
        RESIZE_FINAL.height,
        'JPEG',
        RESIZE_FINAL.quality,
      );

      const response = await Api.verifyFace(
        String(profile.userid),
        resized.uri,
      );

      if (response?.success === 'true' || response?.success === true) {
        setVerifyState('ok');
        setVerifiedPhotoUri(resized.uri);
      } else {
        setVerifyState('fail');
        Alert.alert(
          'Verifikasi Gagal',
          response?.pesan ||
            'Wajah tidak cocok. Pastikan pencahayaan cukup dan coba lagi.',
          [{ text: 'Ulangi', onPress: resetFlow }],
        );
      }
    } catch (err) {
      console.warn('[FaceDetection] captureAndVerify error:', err);
      setVerifyState('fail');
      Alert.alert(
        'Error',
        'Gagal terhubung ke server. Periksa koneksi internet.',
        [{ text: 'Ulangi', onPress: resetFlow }],
      );
    }
  }, [resetFlow]);

  useEffect(() => {
    if (isFinished && verifyState === null) {
      captureAndVerify();
    }
  }, [isFinished, verifyState, captureAndVerify]);

  const handleChallengeSuccess = useCallback(async challengeId => {
    if (isCapturingRef.current) return;
    setIsCapturing(true);

    try {
      setCompletedSteps(prev => new Set([...prev, challengeId]));
      const step = currentStepRef.current;
      const total = challengesRef.current.length;

      if (step < total - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      console.warn('[FaceDetection] handleChallengeSuccess error:', err);
    } finally {
      setTimeout(() => setIsCapturing(false), 600);
    }
  }, []);

  useEffect(() => {
    if (isFinished) return;
    if (!faceStatus.detected) return;
    if (challenges.length === 0) return;
    if (isCapturing) return;

    const currentId = challenges[currentStep];
    if (!currentId || completedSteps.has(currentId)) return;

    const passed =
      (currentId === 'blink' && faceStatus.isBlinking) ||
      (currentId === 'smile' && faceStatus.isSmiling) ||
      (currentId === 'left' && faceStatus.direction === 'left') ||
      (currentId === 'right' && faceStatus.direction === 'right');

    if (passed) handleChallengeSuccess(currentId);
  }, [
    faceStatus,
    currentStep,
    challenges,
    isFinished,
    isCapturing,
    completedSteps,
    handleChallengeSuccess,
  ]);

  const faceDetector = useFaceDetector({
    performanceMode: 'fast',
    classificationMode: 'all',
  });

  const updateFaceStatus = Worklets.createRunOnJS(
    useCallback((faces, frameW, frameH) => {
      if (faces.length === 0) {
        setFacePresent(false);
        setFaceStatus({
          detected: false,
          isSmiling: false,
          isBlinking: false,
          direction: 'center',
        });
        setFaceMessage('Wajah tidak terdeteksi');
        return;
      }

      setFacePresent(true);

      const face = faces[0];
      const validation = getFaceValidationMessage(face.bounds, frameW, frameH);

      if (validation !== true) {
        setFaceStatus({
          detected: false,
          isSmiling: false,
          isBlinking: false,
          direction: 'center',
        });
        setFaceMessage(validation);
        return;
      }

      const isBlinking =
        face.leftEyeOpenProbability < 0.3 && face.rightEyeOpenProbability < 0.3;
      const isSmiling = face.smilingProbability > 0.7;

      let direction = 'center';
      if (face.yawAngle > 20) direction = 'left';
      else if (face.yawAngle < -20) direction = 'right';

      setFaceStatus({ detected: true, isSmiling, isBlinking, direction });
      setFaceMessage('');
    }, []),
  );

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const faces = faceDetector.detectFaces(frame);
      updateFaceStatus(faces, frame.width, frame.height);
    },
    [faceDetector, updateFaceStatus],
  );

  const handleGoBack = async () => {
    try {
      await setBrightnessLevel(0.5);
    } catch (e) {
      console.warn('Gagal menurunkan kecerahan:', e);
    } finally {
      setTimeout(() => {
        navigation.goBack();
      }, 100);
    }
  };

  const handleClockIn = async () => {
    if (verifyState !== 'ok') return;

    const profile = profileRef.current;
    if (!profile?.userid) {
      Alert.alert('Error', 'Data profil tidak ditemukan.');
      return;
    }

    let currentLat = latitude;
    let currentLng = longitude;

    if (currentLat === 0 && currentLng === 0) {
      setLoading(true);
      try {
        console.log('MULAI AMBIL GPS SAAT SUBMIT');
        const loc = await requestLocationPermission();
        if (loc) {
          console.log('GPS BERHASIL', loc);

          currentLat = loc.latitude;
          currentLng = loc.longitude;
        }
      } catch (e) {
        console.log('Gagal mengambil lokasi saat submit:', e);

        if (
          e.message === 'FAKE_GPS_DETECTED' ||
          e.message === 'SUSPICIOUS_ACCURACY'
        ) {
          setLoading(false);
          Alert.alert(
            'Presensi Ditolak',
            'Sistem mendeteksi Anda menggunakan lokasi palsu (Fake GPS). Harap matikan aplikasi tiruan lokasi Anda untuk dapat melanjutkan absensi.',
          );
          return; // Stop proses di sini
        }
      } finally {
        setLoading(false);
      }

      if (currentLat === 0 && currentLng === 0) {
        Alert.alert(
          'Gagal Absen',
          'Koordinat lokasi Anda belum terbaca oleh sistem. Pastikan Anda berada di area yang tidak terhalang gedung tinggi, GPS aktif, lalu tunggu beberapa saat dan coba tekan submit kembali.',
        );
        return;
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('userid', String(profile.userid));
      formData.append('latitude', String(currentLat));
      formData.append('longitude', String(currentLng));
      formData.append('traneventid', String(profile.traneventid));
      formData.append('image', {
        uri: verifiedPhotoUri,
        type: 'image/jpeg',
        name: `clockin_${profile.userid}_${Date.now()}.jpg`,
      });

      const response = await Api.clockIn(formData);

      if (response?.success) {
        const checkInTIme = response?.data?.[0]?.check_in;
        if (checkInTIme) {
          await Storage.updateCheckIn(checkInTIme);
        }

        const currentProfile = await Storage.getProfile();
        const profile = Array.isArray(currentProfile)
          ? currentProfile
          : [currentProfile];
        profile[0].checkin_userid = String(profile[0].userid);
        await Storage.setProfile(profile);

        try {
          await setBrightnessLevel(0.5); // 0.5 adalah 50% kecerahan, sesuaikan dengan kebutuhan
        } catch (e) {
          console.warn('Gagal mengembalikan kecerahan setelah clockin:', e);
        }

        Alert.alert('Sukses', 'Presensi masuk berhasil dicatat!');
        navigation.replace('MainTabs', { screen: 'Home' });
      } else {
        Alert.alert(
          'Gagal',
          response?.pesan || 'Terjadi kesalahan saat mencatat absensi.',
        );
      }
    } catch (error) {
      console.warn('[FaceDetection] handleClockIn error:', error);
      Alert.alert('Error', 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeOnly = dateTimeString => {
    if (!dateTimeString) return '–:–';
    try {
      const timePart = dateTimeString.split(' ')[1];
      if (timePart) {
        return timePart.substring(0, 5);
      }
      return '–:–';
    } catch (error) {
      return '–:–';
    }
  };

  const cameraBorderColor =
    verifyState === 'ok'
      ? '#22c55e'
      : verifyState === 'fail'
      ? '#ef4444'
      : verifyState === 'verifying'
      ? '#f59e0b'
      : isCapturing
      ? '#eab308'
      : faceStatus.detected
      ? '#3b82f6'
      : '#ececec';

  const currentChallengeId = challenges[currentStep];

  if (showCamera && !hasPermission) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center px-9">
        <ScanFace size={64} color="#6366f1" style={{ marginBottom: 24 }} />
        <Text className="text-white text-[22px] font-extrabold mb-3 text-center">
          Butuh Izin Kamera
        </Text>
        <Text className="text-gray-400 text-sm text-center leading-relaxed mb-8">
          Aplikasi memerlukan akses kamera untuk verifikasi kehadiran.
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

  if (showCamera && !device) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-gray-400 text-sm mt-4">Menyiapkan kamera...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-[52px] pb-[14px] border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-9 h-9 items-center justify-center"
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-[15px] font-bold text-gray-900">
          Verifikasi Kehadiran
        </Text>
        <View className="w-9 h-9" />
      </View>

      <View className="flex-1 px-5 pt-5">
        {/* Step indicators */}
        {!isFinished && (
          <StepIndicator
            challenges={challenges}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        )}

        {/* Camera circle */}
        <View className="items-center mb-5">
          <View
            style={{
              width: CAMERA_SIZE,
              height: CAMERA_SIZE,
              borderRadius: CAMERA_SIZE / 2,
              borderWidth: 4,
              borderColor: cameraBorderColor,
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
            }}
          >
            {showCamera && isFocused && device && (
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
                isActive={showCamera && isFocused && verifyState !== 'ok'}
                photo
                pixelFormat="yuv"
                frameProcessor={isFinished ? undefined : frameProcessor}
                onError={error => {
                  console.warn('[FaceDetection] Camera error:', error.code);
                  if (
                    error.code === 'system/camera-is-restricted' ||
                    error.code === 'system/camera-already-in-use' ||
                    error.code === 'system/no-camera-manager'
                  ) {
                    setShowCamera(false);
                    setTimeout(() => {
                      if (isFocused) setShowCamera(true);
                    }, 1200);
                  }
                }}
              />
            )}

            {(isCapturing || verifyState === 'verifying') && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: CAMERA_SIZE,
                  height: CAMERA_SIZE,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color="#fff" size="large" />
                {verifyState === 'verifying' && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: '500',
                      marginTop: 8,
                    }}
                  >
                    Memverifikasi...
                  </Text>
                )}
              </View>
            )}

            {showCamera &&
              !faceStatus.detected &&
              !isCapturing &&
              !isFinished && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingHorizontal: 20,
                  }}
                >
                  <CircleDot size={26} color="#fff" />
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: '600',
                      textAlign: 'center',
                      lineHeight: 18,
                    }}
                  >
                    {faceMessage}
                  </Text>
                </View>
              )}
          </View>

          <View className="mt-2.5" />
        </View>

        {/* Status card */}
        <View className="bg-gray-50 rounded-[20px] p-4 mb-3.5 border border-gray-100">
          {verifyState === 'ok' ? (
            <VerifiedCard total={challenges.length} />
          ) : verifyState === 'verifying' ? (
            <VerifyingCard />
          ) : verifyState === 'fail' ? (
            <FailedCard />
          ) : !isFinished ? (
            <ChallengeCard
              challengeId={currentChallengeId}
              isCapturing={isCapturing}
              stepIndex={currentStep}
              total={challenges.length}
            />
          ) : (
            <VerifyingCard />
          )}
        </View>

        {/* Info cards */}
        <View className="flex-row gap-x-3">
          <View className="flex-1 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
            <View className="flex-row items-center gap-x-1.5 mb-1">
              <Briefcase size={13} color="#64748b" />
              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                Jam kerja
              </Text>
            </View>
            <Text
              className="text-[12px] font-bold text-slate-800"
              numberOfLines={1}
            >
              {user?.startdate && user?.enddate
                ? `${formatTimeOnly(user.startdate)} – ${formatTimeOnly(
                    user.enddate,
                  )}`
                : 'Tidak Ada Jadwal'}{' '}
            </Text>
          </View>

          <View className="flex-1 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
            <View className="flex-row items-center gap-x-1.5 mb-1">
              <MapPin size={13} color="#ef4444" />
              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                Lokasi
              </Text>
            </View>
            <Text
              className="text-[12px] font-bold text-slate-800"
              numberOfLines={1}
            >
              {user?.event_locations || 'Tidak ada lokasi'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom buttons */}
      <View className="px-5 pb-11 pt-3 gap-y-3">
        {verifyState === 'fail' && (
          <TouchableOpacity
            onPress={resetFlow}
            activeOpacity={0.85}
            className="h-[50px] rounded-[18px] items-center justify-center border border-red-200 bg-red-50"
          >
            <Text className="text-base font-bold text-red-500">
              Ulangi Verifikasi
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          disabled={verifyState !== 'ok' || loading}
          onPress={handleClockIn}
          activeOpacity={0.85}
          className={`h-[60px] rounded-[18px] items-center justify-center ${
            verifyState === 'ok' ? 'bg-gray-900' : 'bg-gray-100'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`text-base font-bold ${
                verifyState === 'ok' ? 'text-white' : 'text-gray-400'
              }`}
            >
              {verifyState === 'ok'
                ? 'Submit Presensi Masuk'
                : verifyState === 'verifying'
                ? 'Memverifikasi Wajah...'
                : verifyState === 'fail'
                ? 'Verifikasi Gagal'
                : `Lakukan: ${CHALLENGE_CONFIG[currentChallengeId]?.label}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
