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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gray-600 pt-12 pb-6 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-3"
          >
            <ChevronLeft size={24} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Work Order</Text>
            <Text className="text-gray-200 text-sm mt-0.5">
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
              <View className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center mr-3">
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
        
      </ScrollView>
    </View>
  );
}
