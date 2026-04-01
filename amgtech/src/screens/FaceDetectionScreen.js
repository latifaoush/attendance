import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import {
  useFaceDetector,
  FaceDetectorDefaultOptions,
} from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import {
  Calendar,
  MapPin,
  UserCircle2,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFrameProcessor } from 'react-native-vision-camera';

const { width } = Dimensions.get('window');

export default function FaceDetectionScreen() {
  const navigation = useNavigation();
  const device = useCameraDevice('front');
  const [faceDetected, setFaceDetected] = useState(false);

  // Konfigurasi deteksi wajah
  const faceDetector = useFaceDetector(FaceDetectorDefaultOptions);

  const updateFaceStatus = Worklets.createRunOnJS(detected => {
    setFaceDetected(detected);
  });

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const faces = faceDetector.detectFaces(frame);
      updateFaceStatus(faces.length > 0);
    },
    [faceDetector],
  ); // Dependencies for the processor

  if (!device) return <View className="flex-1 bg-black" />;

  return (
    <View className="flex-1 bg-white">
      {/* Tombol Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-12 left-6 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-md"
      >
        <ArrowLeft size={24} color="black" />
      </TouchableOpacity>

      {/* Camera Circular Preview */}
      <View className="items-center mt-20">
        <View style={styles.cameraCircle}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            pixelFormat="yuv"
            frameProcessor={frameProcessor}
          />
        </View>
        <Text className="mt-6 text-lg text-gray-800 font-medium">
          {faceDetected ? 'Wajah terdeteksi' : 'Tidak ada wajah terdeteksi'}
        </Text>
      </View>

      <View className="px-6 mt-12">
        <View className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
          {/* Row Shift */}
          <View className="flex-row items-center mb-5">
            <Calendar size={22} color="#374151" />
            <View className="mx-2 flex-1">
              <Text className="text-gray-400 text-xs font-medium">Crew</Text>
              <Text className="text-gray-800 font-bold">
                Jumat, 13 Mar 2026 (14:00 - 20:00)
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-gray-100 w-full mb-5" />

          {/* Row Location */}
          <TouchableOpacity className="flex-row items-center">
            <MapPin size={22} color="#ef4444" />
            <Text className="mx-2 text-gray-700 font-medium flex-1">
              Anda berada di luar area presensi
            </Text>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit Button */}
      <View className="absolute bottom-10 w-full px-6">
        <TouchableOpacity
          disabled={!faceDetected}
          className={`py-3 rounded-3xl items-center ${
            faceDetected ? 'bg-gray-300' : 'bg-gray-800'
          }`}
        >
          <Text className="text-white text-lg font-bold">Clock In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraCircle: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#F3F4F6',
  },
});
