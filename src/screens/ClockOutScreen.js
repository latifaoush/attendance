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

export default function ClockOutScreen() {
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

  // --- Distance check state (mirrors FaceDetectionScreen / clock-in flow) ---
  const [isCheckingDistance, setIsCheckingDistance] = useState(true);
  const [distanceError, setDistanceError] = useState(null);

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
      console.log('Mengambil GPS...', { useHighAccuracy });

      Geolocation.getCurrentPosition(
        position => {
          console.log('GPS SUCCESS', position);

          const isMocked = position.mocked || position.coords?.mocked;

          if (isMocked) {
            reject(new Error('FAKE_GPS_DETECTED'));
            return;
          }

          const accuracy = position.coords.accuracy;

          if (accuracy <= 0) {
            reject(new Error('FAKE_GPS_DETECTED'));
            return;
          }

          const currentLatitude = position.coords.latitude;
          const currentLongitude = position.coords.longitude;

          setLatitude(currentLatitude);
          setLongitude(currentLongitude);

          resolve({
            latitude: currentLatitude,
            longitude: currentLongitude,
          });
        },
        error => {
          console.log('GPS ERROR', error);

          if (error.code === 3 && useHighAccuracy) {
            console.log('Fallback ke Network');

            getOneTimeLocation(false).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        },
        {
          enableHighAccuracy: useHighAccuracy,
          timeout: useHighAccuracy ? 15000 : 10000,
          maximumAge: 5000,
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

        if (checkPermission) {
          console.log('Permission already granted');
          return await getOneTimeLocation(true);
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Izin Akses Lokasi',
            message:
              'Aplikasi membutuhkan akses lokasi untuk mencatat posisi work order',
            buttonPositive: 'OK',
            buttonNegative: 'Batal',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');
          return await getOneTimeLocation(true);
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Izin Lokasi Ditolak',
            'Silakan aktifkan izin lokasi di Settings > Apps > AMGTech > Permissions',
            [{ text: 'OK' }],
          );
        } else {
          console.log('Location permission denied');
          Alert.alert('Info', 'Izin lokasi diperlukan untuk mencatat posisi');
        }
      } catch (err) {
        console.warn('Error requesting permission:', err);
        if (err.message === 'FAKE_GPS_DETECTED') throw err;
        return null;
      }
    } else {
      try {
        return await getOneTimeLocation(true);
      } catch (err) {
        if (err.message === 'FAKE_GPS_DETECTED') throw err;
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

  const openCamera = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setShowCamera(true);
  }, [hasPermission, requestPermission]);

  // --- Cek jarak sebelum membuka kamera (sama seperti alur clock-in) ---
  const verifyLocationBeforeFace = useCallback(
    async (currentUserId, currentTranEventId) => {
      setIsCheckingDistance(true);
      setDistanceError(null);

      try {
        const loc = await requestLocationPermission();
        if (!loc) {
          setDistanceError('Gagal mendapatkan koordinat GPS Anda.');
          setIsCheckingDistance(false);
          return;
        }

        const formData = new FormData();
        formData.append('userid', String(currentUserId));
        formData.append('latitude', String(loc.latitude));
        formData.append('longitude', String(loc.longitude));
        formData.append('traneventid', String(currentTranEventId ?? ''));

        const response = await Api.checkDistance(formData);

        if (response?.isInRange === false || response?.success === false) {
          setDistanceError(
            response?.pesan ||
              'Anda berada di luar jangkauan lokasi penugasan.',
          );
        } else {
          const shuffled = pickRandom(CHALLENGE_KEYS, 3);
          setChallenges(shuffled);
          openCamera();
        }
      } catch (err) {
        console.warn('Error check distance:', err);

        if (err?.message === 'FAKE_GPS_DETECTED') {
          setDistanceError(
            'Sistem mendeteksi lokasi palsu (Fake GPS). Matikan aplikasi tiruan lokasi Anda untuk melanjutkan.',
          );
        } else {
          setDistanceError(
            'Gagal memverifikasi jarak. Periksa koneksi internet Anda.',
          );
        }
      } finally {
        setIsCheckingDistance(false);
      }
    },
    [openCamera, requestLocationPermission],
  );

  useEffect(() => {
    Storage.getProfile()
      .then(p => {
        const dataProfile = Array.isArray(p) ? p[0] : p;
        profileRef.current = dataProfile;
        setUser(dataProfile);

        if (dataProfile?.userid) {
          verifyLocationBeforeFace(dataProfile.userid, dataProfile.traneventid);
        } else {
          setIsCheckingDistance(false);
        }
      })
      .catch(e => {
        console.warn('[ClockOut] Gagal load profile:', e);
        setIsCheckingDistance(false);
      });
  }, [verifyLocationBeforeFace]);

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
      console.warn('[ClockOut] captureAndVerify error:', err);
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
      console.warn('[ClockOut] handleChallengeSuccess error:', err);
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

  const handleClockOut = async () => {
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
          currentLat = loc.latitude;
          currentLng = loc.longitude;
        }
      } catch (e) {
        console.log('Gagal mengambil lokasi saat submit:', e.message);

        if (e.message === 'FAKE_GPS_DETECTED') {
          setLoading(false);
          Alert.alert(
            'Presensi Ditolak',
            'Sistem mendeteksi Anda menggunakan lokasi palsu (Fake GPS). Harap matikan aplikasi tiruan lokasi Anda untuk dapat melanjutkan absensi.',
          );
          return;
        }
      } finally {
        setLoading(false);
      }

      if (currentLat === 0 && currentLng === 0) {
        Alert.alert(
          'Gagal Absen',
          'Koordinat lokasi Anda belum terbaca oleh sistem. Pastikan Anda berada di area terbuka, GPS aktif, lalu tunggu beberapa saat dan coba tekan submit kembali.',
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
        name: `clockout_${profile.userid}_${Date.now()}.jpg`,
      });

      const response = await Api.clockOut(formData);

      if (response?.success) {
        const checkOutTime = response?.data?.[0]?.check_out;
        if (checkOutTime) {
          await Storage.updateCheckOut(checkOutTime);
        }

        Alert.alert('Sukses', 'Presensi Keluar berhasil dicatat.', [
          {
            text: 'OK',
            onPress: handleGoBack,
          },
        ]);
      } else {
        Alert.alert(
          'Gagal',
          response?.pesan || 'Terjadi kesalahan saat mencatat absensi.',
        );
      }
    } catch (error) {
      console.warn('[ClockOut] handleClockOut error:', error);
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

  // --- Cek jarak sedang berjalan ---
  if (isCheckingDistance) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 text-sm mt-4 font-medium text-center">
          Memverifikasi koordinat dan jarak jangkauan lokasi Anda...
        </Text>
      </View>
    );
  }

  // --- Di luar jangkauan lokasi penugasan ---
  if (distanceError) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-9">
        <XCircle size={64} color="#ef4444" style={{ marginBottom: 24 }} />
        <Text className="text-gray-900 text-[22px] font-extrabold mb-3 text-center">
          Presensi Ditolak
        </Text>
        <Text className="text-gray-500 text-sm text-center leading-relaxed mb-8">
          {distanceError}
        </Text>
        <View className="w-full gap-y-3">
          <TouchableOpacity
            onPress={() => {
              if (user?.userid)
                verifyLocationBeforeFace(user.userid, user.traneventid);
            }}
            className="bg-gray-900 h-[50px] rounded-2xl items-center justify-center"
          >
            <Text className="text-white text-base font-bold">
              Coba Cek Ulang Lokasi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoBack}
            className="border border-gray-200 h-[50px] rounded-2xl items-center justify-center"
          >
            <Text className="text-gray-600 text-base font-medium">Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
                  console.warn('[ClockOut] Camera error:', error.code);
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
                Jam Kerja
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
          onPress={handleClockOut}
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
                ? 'Submit Presensi Keluar'
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