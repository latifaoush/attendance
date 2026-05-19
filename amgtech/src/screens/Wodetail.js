import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Pressable,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronDown,
  ChevronLeft,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  Camera,
  FileSignature,
  MessageSquare,
  X,
  Phone,
} from 'lucide-react-native';
import {
  Camera as VisionCamera,
  useCameraDevices,
  useCameraPermission,
} from 'react-native-vision-camera';
import SignatureScreen from 'react-native-signature-canvas';
import Geolocation from '@react-native-community/geolocation';
import Storage from '../utils/Storage';
import Api from '../utils/Api';
import axios from 'axios';

function ChecklistItem({ label, checked, onToggle }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      className="flex-row items-center py-3 px-4 mb-2 bg-gray-50 rounded-xl"
    >
      <View
        className={`w-6 h-6 rounded-lg mr-3 items-center justify-center ${
          checked ? 'bg-green-500' : 'bg-white border-2 border-gray-300'
        }`}
      >
        {checked && <CheckCircle2 size={16} color="white" strokeWidth={3} />}
      </View>
      <Text
        className={`flex-1 text-base ${
          checked ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RescheduleReasonInput({
  value,
  onChange,
  remarksList = [],
  selectedRemarksId,
  setSelectedRemarksId,
}) {
  const [isModalVisible, setModalVisible] = useState(false);

  const handleSelect = item => {
    setSelectedRemarksId(item.remarksid);
    onChange(item.keterangan);
    setModalVisible(false);
  };

  return (
    <View className="w-full mb-4">
      <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3.5 bg-white">
        <TextInput
          placeholder="Pilih atau tulis alasan..."
          value={value}
          onChangeText={onChange}
          className="flex-1 text-gray-800 text-base"
          onFocus={() => setModalVisible(true)}
        />
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} className="mr-2 p-1">
            <X size={20} color="#9ca3af" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <ChevronDown color="#6B7280" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-5"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            onPress={e => e.stopPropagation()}
          >
            <View className="bg-indigo-600 px-6 py-5">
              <Text className="text-xl font-bold text-white text-center">
                Pilih Alasan Reschedule
              </Text>
              <Text className="text-indigo-100 text-center text-sm mt-1">
                Pilih dari daftar atau ketik sendiri
              </Text>
            </View>

            <View className="py-2">
              <FlatList
                data={remarksList}
                keyExtractor={item => item.remarksid.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    className={`px-6 py-4 flex-row items-center justify-between border-b border-gray-100 active:bg-indigo-50 ${
                      selectedRemarksId === item.remarksid ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <Text className="text-gray-800 text-base font-medium flex-1">
                      {item.keterangan}
                    </Text>
                    {selectedRemarksId === item.remarksid && (
                      <CheckCircle2 size={20} color="#4f46e5" fill="#4f46e5" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text className="text-center text-gray-500 py-4">
                    Loading alasan reschedule...
                  </Text>
                }
              />
            </View>

            <View className="px-5 pb-5 pt-3 bg-gray-50">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-gray-700 py-3.5 rounded-xl active:bg-gray-800 shadow-sm"
              >
                <Text className="text-center text-white font-semibold text-base">
                  Tutup
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function WorkOrderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photoBefore, setPhotoBefore] = useState(null);
  const [photoAfter, setPhotoAfter] = useState(null);
  const cameraRef = useRef(null);
  const [note, setNote] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState(null);
  const sigRef = useRef();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [remarksList, setRemarksList] = useState([]);
  const [selectedRemarksId, setSelectedRemarksId] = useState('');
  const devices = useCameraDevices();
  const device = Array.isArray(devices)
    ? devices.find(d => d.position === 'back') || devices[0]
    : devices.back || devices[0];
  const [checklist, setChecklist] = useState({
    Remote: false,
    Dekoder: false,
    Kabel: false,
    Modem: false,
  });
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [watchID, setWatchID] = useState(null);

  const fetchRemarks = useCallback(async () => {
    try {
      const response = await Storage.getRemarks('');
      setRemarksList(response);
    } catch (error) {
      console.log('Error fetch remarks:', error);
    }
  }, []);

  const getOneTimeLocation = useCallback(async (useHighAccuracy = true) => {
    Geolocation.getCurrentPosition(
      position => {
        const currentLongitude = position.coords.longitude;
        const currentLatitude = position.coords.latitude;

        console.log(
          'Long = ' + currentLongitude + ', Lat = ' + currentLatitude,
        );
        setLatitude(currentLatitude);
        setLongitude(currentLongitude);

        console.log('✓ Lokasi berhasil didapat');
      },
      error => {
        console.log('Error getting location:', error.message, error.code);

        if (error.code === 3 && useHighAccuracy) {
          // TIMEOUT dengan GPS - coba lagi pakai Network
          console.log('GPS timeout, mencoba dengan Network Location...');
          // Alert.alert(
          //   'GPS Timeout',
          //   'Sinyal GPS lemah. Menggunakan lokasi dari jaringan...',
          // );
          // Retry dengan Network Location
          getOneTimeLocation(false);
        } else if (error.code === 2) {
          // No location provider
          console.log('GPS tidak aktif');
          Alert.alert(
            'GPS Tidak Aktif',
            'Silakan aktifkan GPS/Location di pengaturan HP Anda',
            [
              {
                text: 'Coba Lagi',
                onPress: () => getOneTimeLocation(true),
              },
              { text: 'Nanti', style: 'cancel' },
            ],
          );
        } else {
          // Error lain
          console.log(
            'Tidak dapat mendapatkan lokasi. Work order akan disubmit tanpa koordinat GPS.',
          );
          // Alert.alert(
          //   'Info Lokasi',
          //   'Tidak dapat mendapatkan lokasi. Work order akan disubmit tanpa koordinat GPS.',
          // );
        }
      },
      {
        enableHighAccuracy: useHighAccuracy,
        timeout: useHighAccuracy ? 15000 : 10000,
        maximumAge: 10000,
        distanceFilter: 10,
      },
    );
  }, []);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const checkPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (checkPermission) {
          console.log('Permission already granted');
          getOneTimeLocation(true);
          return;
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
          getOneTimeLocation(true);
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
      }
    } else {
      getOneTimeLocation(true);
    }
  }, [getOneTimeLocation]);

  // YANG BARU (GUNAKAN INI)
  useEffect(() => {
    fetchWorkOrderDetail(id);
    fetchRemarks();

    return () => {
      if (watchID) {
        Geolocation.clearWatch(watchID);
      }
    };
  }, [id, fetchRemarks, watchID]);

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      let gambarno = 1;
      if (photoBefore && !photoAfter) {
        gambarno = 2;
      }

      if (!photoBefore) {
        setPhotoBefore(photo);
      } else if (!photoAfter) {
        setPhotoAfter(photo);
      }

      await uploadFoto(photo.path, gambarno);

      setShowCamera(false);
    } catch (err) {
      console.log('Error take photo:', err);
      Alert.alert('Error', 'Gagal mengambil atau mengupload foto');
    }
  };

  const fetchWorkOrderDetail = async woId => {
    try {
      setLoading(true);
      const profile = await Storage.getProfile();
      const params = {
        loginID: profile[0]?.userid,
        workerorderid: woId,
      };
      const response = await Api.post('getworkorder', params);
      // console.log('Response API:', response);

      if (response?.data?.[0]) {
        const apiItem = response.data[0];
        const mapped = {
          no: apiItem.workerorderno || '-',
          customer: apiItem.customername || 'Unknown',
          address: apiItem.address || '-',
          date: apiItem.workerorderdate || '-',
          phone: apiItem.phone || '-',
          status: apiItem.statuswovw || 'Open',
          complain: apiItem.complain || '-',
          note: apiItem.catatanteknisi || '-',
          remarks: apiItem.remarks || '-',
          area: apiItem.areaname || '-',
          subarea: apiItem.subareaname || '-',
          workordertype: apiItem.workerordertypevw || '-',
          isremote: apiItem.isremot === 1 ? true : false,
          ismodem: apiItem.ismodem === 1 ? true : false,
          iskabel: apiItem.iskabel === 1 ? true : false,
          isdekoder: apiItem.isdekoder === 1 ? true : false,
          foto1:
            apiItem.foto1 === '' ? '' : apiItem.foto1 + '?time=' + new Date(),
          foto2:
            apiItem.foto2 === '' ? '' : apiItem.foto2 + '?time=' + new Date(),
          foto3:
            apiItem.foto3 === '' ? '' : apiItem.foto3 + '?time=' + new Date(),
        };
        setDetail(mapped);
        setNote(mapped.note);
        if (apiItem.foto1 && apiItem.foto1.trim() !== '') {
          setPhotoBefore({ uri: apiItem.foto1 + '?t=' + Date.now() });
        } else {
          setPhotoBefore(null);
        }

        if (apiItem.foto2 && apiItem.foto2.trim() !== '') {
          setPhotoAfter({ uri: apiItem.foto2 + '?t=' + Date.now() });
        } else {
          setPhotoAfter(null);
        }

        if (apiItem.foto3 && apiItem.foto3.trim() !== '') {
          setSignature(apiItem.foto3 + '?t=' + Date.now());
        } else {
          setSignature(null);
        }

        setChecklist({
          Remote: mapped.isremote === true,
          Modem: mapped.ismodem === true,
          Kabel: mapped.iskabel === true,
          Dekoder: mapped.isdekoder === true,
        });
      } else {
        console.log('No detail data');
        setDetail({});
      }
    } catch (error) {
      console.log('Fetching error:', error);
    }
    setLoading(false);
  };

  const toggleChecklist = item => {
    setChecklist(prev => {
      const newChecklist = { ...prev, [item]: !prev[item] };

      submitKelengkapan(newChecklist);

      return newChecklist;
    });
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  // const handleSubmitReschedule = () => {
  //   console.log({ reason: rescheduleReason, date: selectedDate });
  //   Alert.alert('Reschedule berhasil disubmit!');
  // };

  const Goto = param => {
    if (param === 'close') {
      Alert.alert(
        'Konfirmasi Perubahan Status',
        'Perbarui Status Menjadi (Closed)',
        [
          {
            text: 'Cancel',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          { text: 'OK', onPress: () => submitWorkOrder('2', '', '') },
        ],
      );
    }
  };

  const submitWorkOrder = async (
    statusnew,
    remarksid = '',
    rescheduleDate = '',
  ) => {
    try {
      if (latitude === 0 || longitude === 0) {
        await requestLocationPermission();
      }

      setLoadingSubmit(true);
      const profile = await Storage.getProfile();
      const formData = new FormData();

      formData.append('loginID', profile[0].userid);
      formData.append('workerorderid', id);
      formData.append('statuswo', '1');
      formData.append('statusnew', statusnew);
      formData.append('remarksid', remarksid);
      formData.append('reschedule', rescheduleDate);
      formData.append('isdekoder', checklist.Dekoder ? '1' : '0');
      formData.append('ismodem', checklist.Modem ? '1' : '0');
      formData.append('iskabel', checklist.Kabel ? '1' : '0');
      formData.append('isremote', checklist.Remote ? '1' : '0');
      formData.append('catatanteknisi', note);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());

      console.log('Submit Work Order FormData:', {
        workerorderid: id,
        statusnew,
        remarksid,
        reschedule: rescheduleDate,
        latitude,
        longitude,
      });

      const response = await axios.post(
        Api.getBaseUrl() + '/submitworkorder',
        formData,
        {
          headers: Api.headersform(),
        },
      );

      console.log('Response Submit WO:', response);

      if (response.data.success) {
        Alert.alert(
          'Berhasil',
          response.data.pesan || 'Status berhasil diubah',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('MainTabs', { screen: 'WorkOrder' });
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Gagal',
          response.data.pesan || 'Tidak dapat mengubah status',
        );
      }
    } catch (error) {
      console.log('Error update status:', error.response?.data || error);
      Alert.alert('Error', error.response?.data?.pesan || 'Terjadi kesalahan');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const submitReschedule = () => {
    if (!rescheduleReason.trim()) {
      Alert.alert('Peringatan', 'Alasan reschedule harus diisi!');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Peringatan', 'Tanggal reschedule harus dipilih!');
      return;
    }

    const formattedDate = selectedDate.toISOString().split('T')[0];
    const finalDate = formattedDate.replace(/-/g, '/');

    Alert.alert(
      'Konfirmasi Reschedule',
      `Tanggal: ${selectedDate.toLocaleDateString(
        'id-ID',
      )}\nAlasan: "${rescheduleReason}"\n\nLanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Reschedule',
          onPress: () => {
            const remarksIdToSend = selectedRemarksId || `${rescheduleReason}`;
            submitWorkOrder('4', remarksIdToSend, finalDate);
          },
        },
      ],
    );
  };

  // const completedCount = Object.values(checklist).filter(Boolean).length;
  // const totalCount = Object.keys(checklist).length;
  // const progressPercentage = (completedCount / totalCount) * 100;

  const submitKelengkapan = async currentChecklist => {
    try {
      // const profile = await Storage.getProfile();
      const formData = new FormData();

      formData.append('workerorderid', id);
      formData.append('isdekoder', currentChecklist.Dekoder ? '1' : '0');
      formData.append('ismodem', currentChecklist.Modem ? '1' : '0');
      formData.append('iskabel', currentChecklist.Kabel ? '1' : '0');
      formData.append('isremote', currentChecklist.Remote ? '1' : '0');
      formData.append('catatanteknisi', note);

      // console.log(formData);
      // console.log('Kirim checklist ke /submitkelengkapan ...');

      const response = await axios.post(
        Api.getBaseUrl() + '/submitkelengkapan',
        formData,
        {
          headers: Api.headersform(),
        },
      );

      if (response.data.success) {
        console.log('Checklist berhasil disimpan');
      } else {
        console.log('Gagal simpan checklist:', response.data.pesan);
      }
    } catch (error) {
      console.log('Error submitKelengkapan:', error.response?.data || error);
    }
  };

  const uploadFoto = async (photoPath, gambarno) => {
    if (!photoPath) return;

    try {
      const formData = new FormData();

      formData.append('workerorderid', id);
      formData.append('gambarno', gambarno);
      formData.append('file', {
        uri: photoPath.startsWith('file://')
          ? photoPath
          : `file://${photoPath}`,
        type: 'image/jpeg',
        name: `foto${gambarno}.jpg`,
      });

      // console.log(`Sedang upload Foto ${gambarno}...`);

      const response = await axios.post(
        Api.getBaseUrl() + '/uploadfoto',
        formData,
        {
          headers: Api.headersform(),
          timeout: 5000,
        },
      );

      if (response.data.success) {
        console.log(`Foto ${gambarno} berhasil diupload!`);
      } else {
        console.log('Gagal upload:', response.data.pesan);
        Alert.alert('Gagal', response.data.pesan || 'Upload foto gagal');
      }
    } catch (error) {
      console.log('Error upload foto:', error.response?.data || error);
      Alert.alert('Error', 'Gagal upload foto.');
    }
  };

  const uploadSignature = async signatureUri => {
    if (!signatureUri) return;

    try {
      const formData = new FormData();

      formData.append('workerorderid', id);
      formData.append('gambarno', '3');
      formData.append('file', {
        uri: signatureUri,
        type: 'image/png',
        name: `ttd_${id}.png`,
      });

      // console.log('Sedang upload tanda tangan...');

      const response = await axios.post(
        Api.getBaseUrl() + '/uploadfoto',
        formData,
        {
          headers: Api.headersform(),
          timeout: 5000,
        },
      );

      if (response.data.success) {
        console.log('Tanda tangan berhasil diupload ke server!');
        Alert.alert(
          'Sukses',
          'Tanda tangan customer berhasil disimpan di server!',
        );
      } else {
        Alert.alert(
          'Gagal',
          response.data.pesan || 'Gagal upload tanda tangan',
        );
      }
    } catch (error) {
      console.log('Error upload tanda tangan:', error.response?.data || error);
      Alert.alert('Error', 'Gagal mengunggah tanda tangan ke server');
    }
  };

  if (showCamera) {
    if (!hasPermission) {
      return (
        <View className="flex-1 bg-gray-900 justify-center items-center px-8">
          <Text className="text-white text-2xl mb-8 text-center font-bold">
            Butuh Izin Kamera
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-indigo-600 px-10 py-4 rounded-2xl"
          >
            <Text className="text-white text-xl font-bold">Izinkan Kamera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!device) {
      return (
        <View className="flex-1 bg-gray-900 justify-center items-center">
          <Text className="text-white text-2xl">Menyiapkan kamera...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1">
        <VisionCamera
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={true}
          photo={true}
        />

        {/* Tombol Capture */}
        <View className="absolute bottom-20 left-0 right-0 items-center">
          <TouchableOpacity
            onPress={takePhoto}
            className="w-20 h-20 rounded-full bg-white/30 border-4 border-white justify-center items-center"
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </TouchableOpacity>
        </View>

        {/* Tombol Tutup */}
        <TouchableOpacity
          onPress={() => setShowCamera(false)}
          className="absolute top-12 left-6 bg-black/50 px-6 py-3 rounded-full"
        >
          <Text className="text-white text-lg font-semibold">Tutup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showSignature) {
    return (
      <Modal visible={showSignature} animationType="slide">
        <View className="flex-1 bg-gray-900">
          {/* Header */}
          <View className="flex-row justify-between items-center p-5 bg-blue-600">
            <Text className="text-white text-xl font-bold">Signature</Text>
            <TouchableOpacity onPress={() => setShowSignature(false)}>
              <X size={32} color="white" />
            </TouchableOpacity>
          </View>

          {/* Canvas Tanda Tangan */}
          <SignatureScreen
            ref={sigRef}
            onOK={async img => {
              setSignature(img);
              setShowSignature(false);
              await uploadSignature(img);
              Alert.alert(
                'Sukses',
                'Tanda tangan berhasil disimpan & diupload!',
              );
            }}
            onEmpty={() =>
              Alert.alert('Info', 'Silakan tanda tangan terlebih dahulu')
            }
            clearText="Clear"
            confirmText="Save"
            autoClear={false}
            descriptionText=""
            webStyle={`
              .m-signature-pad {
                height: 100%;
                background-color: white;
                border-radius: 16px;
                margin: 16px;
                width: 92%;
              }
              .m-signature-pad--footer {
                padding: 20px;
                background-color: #f3f4f6;
              }
              .button {
                background-color: #4f46e5;
                border-radius: 12px;
                font-weight: bold;
              }
              .button.clear { background-color: #ef4444; }
            `}
          />
        </View>
      </Modal>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-indigo-600 pt-12 pb-6 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-3"
          >
            <ChevronLeft size={24} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Work Order</Text>
            <Text className="text-indigo-200 text-sm mt-0.5">
              No: {detail?.no}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 -mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* <TouchableOpacity
          onPress={requestLocationPermission}
          className="bg-blue-500 py-3 mx-5 rounded-xl mb-4"
        >
          <Text className="text-white text-center font-bold">
            Request Location Permission
          </Text>
        </TouchableOpacity> */}
        {/* Customer Info Card */}
        <View className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <Text className="text-gray-900 text-lg font-bold mb-4">
            Customer Information
          </Text>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-indigo-100 rounded-xl items-center justify-center mr-3">
                <User size={20} color="#4f46e5" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-0.5">
                  Customer Name
                </Text>
                <Text className="text-gray-900 font-semibold">
                  {detail?.customer}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-indigo-100 rounded-xl items-center justify-center mr-3 mt-1">
                <Phone size={20} color="#4f46e5" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-0.5">
                  Customer Phone
                </Text>
                <Text className="text-gray-900 font-semibold">
                  {detail?.phone}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mr-3 mt-1">
                <MapPin size={20} color="#10b981" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-0.5">Address</Text>
                <Text className="text-gray-900 font-semibold">
                  {detail?.address}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mr-3 mt-1">
                <Calendar size={20} color="#3b82f6" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-0.5">Date</Text>
                <Text className="text-gray-900 font-semibold">
                  {detail?.date}
                </Text>
              </View>
            </View>
          </View>

          {detail?.complain && (
            <View className="mt-4 p-3 bg-green-50 rounded-xl">
              <Text className="text-green-900 text-sm">
                <Text className="font-bold">Complain: </Text>
                {detail?.complain}
              </Text>
            </View>
          )}

          {detail?.remarks && (
            <View className="mt-4 p-3 bg-amber-50 rounded-xl">
              <Text className="text-amber-900 text-sm">
                <Text className="font-bold">Remarks: </Text>
                {detail?.remarks}
              </Text>
            </View>
          )}

          <Text className="text-indigo-600 text-sm font-bold  mt-3 ml-2">
            {detail?.workordertype}
          </Text>
        </View>
        {/* Checkbox */}
        <View className="bg-white rounded-2xl shadow-md p-5 mb-4">
          {/* <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-900 text-lg font-bold">
              Installation Checklist
            </Text>
            <Text className="text-indigo-600 text-sm font-semibold">
              {completedCount}/{totalCount}
            </Text>
          </View> */}

          {/* Progress Bar */}
          {/* <View className="h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
            <View
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </View> */}

          {Object.keys(checklist).map(item => (
            <ChecklistItem
              key={item}
              label={item}
              checked={checklist[item]}
              onToggle={() => toggleChecklist(item)}
            />
          ))}
        </View>
        {/* Documentation */}
        <View className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-6">
            Documentation
          </Text>

          {/* FOTO 1 */}
          <View className="mb-8">
            <TouchableOpacity
              onPress={() => {
                setPhotoBefore(null);
                setShowCamera(true);
              }}
              className={`flex-row items-center p-5 rounded-2xl border-2 border-dashed ${
                photoBefore
                  ? 'bg-green-50 border-green-500'
                  : 'bg-indigo-50 border-indigo-400'
              } active:opacity-80`}
            >
              <View className="w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mr-4">
                <Camera size={28} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {photoBefore ? 'Ulang Foto 1' : 'Take Photo 1'}
                </Text>
                <Text className="text-sm text-gray-600">
                  {photoBefore ? 'Sudah diupload' : 'Belum diambil'}
                </Text>
              </View>
              {photoBefore && <Text className="text-4xl">Check</Text>}
            </TouchableOpacity>

            {photoBefore && (
              <View className="mt-4 rounded-2xl overflow-hidden border-4 border-green-500">
                <Image
                  source={{
                    uri:
                      typeof photoBefore === 'string'
                        ? photoBefore
                        : photoBefore.uri || `file://${photoBefore.path}`,
                  }}
                  className="w-full h-80"
                  resizeMode="cover"
                />
                <View className="absolute top-3 right-3 bg-green-600 px-4 py-2 rounded-full">
                  <Text className="text-white font-bold">FOTO 1</Text>
                </View>
              </View>
            )}
          </View>

          {/* FOTO 2 */}
          <View className="mb-8">
            <TouchableOpacity
              onPress={() => {
                if (!photoBefore) {
                  Alert.alert('Info', 'Ambil Foto 1 terlebih dahulu ya lek');
                  return;
                }
                setPhotoAfter(null);
                setShowCamera(true);
              }}
              className={`flex-row items-center p-5 rounded-2xl border-2 border-dashed ${
                photoAfter
                  ? 'bg-green-50 border-green-500'
                  : 'bg-indigo-50 border-indigo-400'
              } active:opacity-80`}
            >
              <View className="w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mr-4">
                <Camera size={28} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {photoAfter ? 'Ulang Foto 2' : 'Take Photo 2'}
                </Text>
                <Text className="text-sm text-gray-600">
                  {photoAfter ? 'Sudah diupload' : 'Belum diambil'}
                </Text>
              </View>
              {photoAfter && <Text className="text-4xl">Check</Text>}
            </TouchableOpacity>

            {photoAfter && (
              <View className="mt-4 rounded-2xl overflow-hidden border-4 border-green-500">
                <Image
                  source={{
                    uri:
                      typeof photoAfter === 'string'
                        ? photoAfter
                        : photoAfter.uri || `file://${photoAfter.path}`,
                  }}
                  className="w-full h-80"
                  resizeMode="cover"
                />
                <View className="absolute top-3 right-3 bg-green-600 px-4 py-2 rounded-full">
                  <Text className="text-white font-bold">FOTO 2</Text>
                </View>
              </View>
            )}
          </View>

          {/* Customer Signature */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Signature
            </Text>

            <TouchableOpacity
              onPress={() => setShowSignature(true)}
              className={`flex-row items-center p-5 rounded-2xl border-2 border-dashed ${
                signature
                  ? 'bg-green-50 border-green-500'
                  : 'bg-purple-50 border-purple-400'
              } active:opacity-80`}
            >
              <View className="w-14 h-14 bg-purple-600 rounded-2xl items-center justify-center mr-4">
                <FileSignature size={28} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {signature ? 'Signature' : 'Tap to Sign'}
                </Text>
                <Text className="text-gray-500 text-sm">Confirmation</Text>
              </View>
              {signature && <Text className="text-4xl">Check</Text>}
            </TouchableOpacity>

            {signature && (
              <View className="mt-4 rounded-2xl overflow-hidden border-4 border-green-500 bg-white">
                <Image
                  source={{
                    uri: typeof signature === 'string' ? signature : signature,
                  }}
                  className="w-full h-64"
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </View>
        {/* Additional Notes */}
        <View className="bg-white rounded-2xl shadow-md p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <MessageSquare size={20} color="#4f46e5" strokeWidth={2.5} />
            <Text className="text-gray-900 text-lg font-bold ml-2">
              Catatan teknisi
            </Text>
          </View>
          <TextInput
            className="border border-gray-300 rounded-xl p-4 text-gray-700 mb-4 min-h-[100px]"
            placeholder="Tuliskan catatan tambahan di sini..."
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            value={note}
            onChangeText={setNote}
            onEndEditing={submitKelengkapan}
          />

          {/* Visual koordinat */}
          {/* <View className="flex-row items-center justify-between mb-3 px-2 py-2 bg-gray-100 rounded-lg">
            <View className="flex-1">
              <Text className="text-gray-600 text-xs mb-1">Status GPS:</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {latitude !== 0 && longitude !== 0
                  ? `✓ ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                  : '⏳ Mencari lokasi...'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => getOneTimeLocation(true)}
              className="bg-blue-500 px-4 py-2 rounded-lg ml-2"
            >
              <Text className="text-white text-xs font-bold">Refresh</Text>
            </TouchableOpacity>
          </View> */}

          <TouchableOpacity
            onPress={() => {
              Goto('close');
            }}
            disabled={loadingSubmit}
            className={`py-4 rounded-xl shadow-md flex-row justify-center items-center ${
              loadingSubmit ? 'bg-gray-400' : 'bg-green-600 active:bg-green-700'
            }`}
          >
            {loadingSubmit ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-bold text-base ml-3">
                  Mengirim...
                </Text>
              </>
            ) : (
              <Text className="text-center text-white font-bold text-base">
                Complete Work Order
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {/* Reschedule */}
        <View className="bg-white rounded-2xl shadow-md p-5 mb-8">
          <View className="flex-row items-center mb-3">
            <Calendar size={20} color="#f59e0b" strokeWidth={2.5} />
            <Text className="text-gray-900 text-lg font-bold ml-2">
              Reschedule
            </Text>
          </View>

          <View className="w-full mb-4">
            <Text className="text-base font-semibold mb-2 text-gray-700">
              Alasan Reschedule
            </Text>

            <RescheduleReasonInput
              value={rescheduleReason}
              onChange={setRescheduleReason}
              remarksList={remarksList}
              selectedRemarksId={selectedRemarksId}
              setSelectedRemarksId={setSelectedRemarksId}
            />

            {/* Text input untuk custom remarks (opsional) */}
            {/* <TextInput
              placeholder="Atau tulis alasan sendiri..."
              value={rescheduleReason}
              onChangeText={text => {
                setRescheduleReason(text);
                setSelectedRemarksId(''); 
              }}
              className="mt-3 border border-gray-300 rounded-xl px-4 py-3.5 bg-white"
              multiline
            /> */}
          </View>

          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              className="bg-indigo-500 py-4 px-4 rounded-xl flex-1 mr-2 shadow-sm active:bg-indigo-600"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-center text-white font-semibold">
                {selectedDate
                  ? selectedDate.toLocaleDateString()
                  : 'Select Date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`py-4 px-4 rounded-xl flex-1 ml-2 shadow-sm flex-row justify-center items-center ${
                !rescheduleReason.trim() || !selectedDate
                  ? 'bg-gray-400'
                  : 'bg-amber-500 active:bg-amber-600'
              }`}
              onPress={submitReschedule}
              disabled={!rescheduleReason.trim() || !selectedDate}
            >
              {loadingSubmit ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold ml-2">Mengirim...</Text>
                </>
              ) : (
                <Text className="text-center text-white font-bold">
                  Reschedule
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
