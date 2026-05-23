import React, { useCallback, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Ellipsis,
  ArrowRightToLine,
} from 'lucide-react-native';
import Geolocation from '@react-native-community/geolocation';
import { useCameraPermission } from 'react-native-vision-camera';
import Storage from '../utils/Storage';
import Api from '../utils/Api';
import { useNavigation } from '@react-navigation/native';

function StatCard({ title, value, icon: Icon, gradient, trend, trendValue }) {
  return (
    <View className="bg-white rounded-3xl shadow-lg p-5 mb-4">
      <View className="flex-row justify-between items-start mb-3">
        <View className={`p-3 rounded-2xl ${gradient}`}>
          <Icon size={24} color="white" strokeWidth={2.5} />
        </View>
        {trend && (
          <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-full">
            <TrendingUp size={12} color="#10b981" strokeWidth={3} />
            <Text className="text-green-600 text-xs font-bold ml-1">
              {trendValue}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-gray-500 text-sm font-medium mb-1">{title}</Text>
      <Text className="text-gray-900 text-3xl font-bold">{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [stat, setStats] = useState({
    total: 'Counting...',
    open: 'Counting...',
    inProgress: 'Counting...',
    completed: 'Counting...',
  });
  const navigation = useNavigation();

  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
  } = useCameraPermission();

  const requestAllPermissions = useCallback(async () => {
    console.log(' Requesting permissions...');

    if (Platform.OS === 'android') {
      try {
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Izin Akses Lokasi',
            message:
              'Aplikasi membutuhkan akses lokasi untuk mencatat posisi event',
            buttonPositive: 'Izinkan',
            buttonNegative: 'Nanti',
          },
        );

        if (locationGranted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✓ Location permission granted');
          Geolocation.getCurrentPosition(
            position => {
              console.log(
                '✓ Initial location:',
                position.coords.latitude,
                position.coords.longitude,
              );
            },
            error => {
              console.log('Initial location error (normal):', error.message);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 },
          );
        } else {
          console.log('⚠️ Location permission denied');
        }
      } catch (err) {
        console.warn('Location permission error:', err);
      }
    } else {
      Geolocation.requestAuthorization();
    }

    if (!hasCameraPermission) {
      try {
        const cameraGranted = await requestCameraPermission();
        if (cameraGranted) {
          console.log('✓ Camera permission granted');
        } else {
          console.log('⚠️ Camera permission denied');
        }
      } catch (err) {
        console.warn('Camera permission error:', err);
      }
    } else {
      console.log('✓ Camera permission already granted');
    }
  }, [hasCameraPermission, requestCameraPermission]);

  const getAllWorkOrders = async () => {
    try {
      var data = await Storage.getProfile();
      let page = 1;
      let allData = [];
      let hasMore = true;

      while (hasMore) {
        const params = {
          loginID: data[0]['userid'],
          page: page,
          limit: 1000,
        };
        const response = await Api.post('getworkorder', params);
        const allWorkOrders = response?.data || [];

        if (allWorkOrders.length > 0) {
          allData = [...allData, ...allWorkOrders];
          page++;
        } else {
          hasMore = false;
        }
      }

      const total = allData.length;
      const totalInProgress = allData.filter(
        w => w.statuswovw === 'Progress',
      ).length;
      const totalCompleted = allData.filter(
        w => w.statuswovw === 'Closed',
      ).length;
      const totalOpen = allData.filter(w => w.statuswovw === 'Open').length;

      setStats({
        total,
        open: totalOpen,
        inProgress: totalInProgress,
        completed: totalCompleted,
      });

      const recentActivity = allData
        .sort(
          (a, b) => new Date(b.workerordertime) - new Date(a.workerordertime),
        )
        .slice(0, 3);
      // console.log(recentActivity);
      setWorkOrders(recentActivity);
    } catch (error) {
      console.log('Error ambil semua data WorkOrder:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        await requestAllPermissions();

        const profile = await Storage.getProfile();
        if (Array.isArray(profile) && profile.length > 0) {
          setUser({ ...profile[0] });
        } else {
          setUser({ ...profile });
        }

        getAllWorkOrders();
      };

      loadProfile();
    }, [requestAllPermissions]),
  );

  const stats = [
    {
      title: 'Total Work Orders',
      value: stat.total,
      icon: Briefcase,
      gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    },
    {
      title: 'In Progress',
      value: stat.inProgress,
      icon: Clock,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
    },
    {
      title: 'Completed',
      value: stat.completed,
      icon: CheckCircle2,
      gradient: 'bg-gradient-to-br from-emerald-500 to-green-600',
    },
    {
      title: 'Open',
      value: stat.open,
      icon: AlertCircle,
      gradient: 'bg-gradient-to-br from-red-500 to-red-600',
    },
  ];

  const formatPresensi = dateTimeStr => {
    if (!dateTimeStr || dateTimeStr === '') return '-';
    const date = new Date(dateTimeStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return dateTimeStr;

    const jam = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const tanggal = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });

    return `${tanggal} (${jam})`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header with Gradient */}
      <View className="bg-gray-600 pt-10 pb-8 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-indigo-200 text-sm font-medium">
              Welcome back,
            </Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {user?.employeenama || 'User'}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-3 -mt-8">
        <View
          style={{ zIndex: 10 }}
          className="bg-white rounded-3xl shadow-xl p-6 flex-row justify-center items-center"
        >
          <View className="flex-column items-center">
            <Text className="text-gray-900 text-md text-center font-bold">
              Jadwal Anda Hari Ini
            </Text>
            <View className="flex-row items-center mt-2">
              <ArrowRightToLine
                size={18}
                color="black"
                strokeWidth={2}
                style={{ marginLeft: 2 }}
              />
              <Text className="text-gray-700 text-lg ml-2 font-bold">
                08:00 AM
              </Text>
              <Ellipsis
                size={18}
                color="gray"
                strokeWidth={2}
                style={{ marginHorizontal: 8 }}
              />
              <ArrowRightToLine
                size={18}
                color="black"
                strokeWidth={2}
                style={{ marginLeft: 2 }}
              />
              <Text className="text-gray-700 text-lg ml-2 font-bold">
                17:00 PM
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-gray-700 rounded-b-3xl shadow-lg p-4 pt-8 -mt-6 flex-row justify-around items-center">
          {/* Kolom Masuk */}
          <View className="items-center flex-1 border-r border-gray-600">
            <Text className="text-white text-xs font-medium uppercase">
              Presensi Masuk
            </Text>
            <Text className="text-white text-sm font-bold mt-0.5">
              {user?.check_in && user?.check_in !== ''
                ? formatPresensi(user.check_in)
                : '-'}
            </Text>
          </View>

          {/* Kolom Keluar */}
          <View className="items-center flex-1">
            <Text className="text-white text-xs font-medium uppercase">
              Presensi Keluar
            </Text>
            <Text className="text-white text-sm font-bold mt-0.5">
              {user?.check_out && user?.check_out !== ''
                ? formatPresensi(user.check_out)
                : '-'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 2, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View className="mb-6 mt-6">
          <Text className="text-gray-900 text-lg font-bold mb-4">Overview</Text>
          <View className="flex-row flex-wrap -mx-2">
            {stats.map((stat, index) => (
              <View key={index} className="w-1/2 px-2">
                <StatCard {...stat} />
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        {/* <View className="mb-6">
          <Text className="text-gray-900 text-lg font-bold mb-4">
            Quick Actions
          </Text>
          {quickActions.map((action, index) => (
            <QuickActionCard key={index} {...action} />
          ))}
        </View> */}

        {/* Recent Activity */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-900 text-lg font-bold">Recent Add</Text>
          </View>

          <View className="bg-white rounded-2xl shadow-sm p-4">
            {workOrders.length > 0 ? (
              workOrders.map((item, index) => {
                let statusColor =
                  item.statuswovw === 'Closed'
                    ? 'bg-green-100 text-green-700'
                    : item.statuswovw === 'Progress'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700';

                let StatusIcon =
                  item.statuswovw === 'Closed'
                    ? CheckCircle2
                    : item.statuswovw === 'Progress'
                    ? Clock
                    : AlertCircle;

                const timeStr = item.workerordertime;
                let daysAgoText = '-';
                if (timeStr) {
                  const d = new Date(timeStr);
                  if (!isNaN(d.getTime())) {
                    const diffDays = Math.floor(
                      (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    daysAgoText =
                      diffDays === 0 ? 'Today' : `${diffDays} days ago`;
                  } else {
                    daysAgoText = timeStr;
                  }
                }

                return (
                  <View
                    key={index}
                    className="flex-row items-center py-3 border-b border-gray-100"
                  >
                    <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                      <StatusIcon size={18} color="#4f46e5" strokeWidth={2.5} />
                    </View>

                    <View
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      className="flex-1"
                    >
                      <Text className="text-gray-900 font-semibold text-sm">
                        {item.customername || 'Unknown Customer'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-gray-500 text-xs mt-0.5"
                      >
                        {item.complain || '-'} - {daysAgoText}
                      </Text>
                    </View>

                    <View className={`px-3 py-1 rounded-full ${statusColor}`}>
                      <Text
                        className={`text-xs font-semibold ${
                          statusColor.includes('text')
                            ? statusColor.split(' ')[1]
                            : 'text-gray-700'
                        }`}
                      >
                        {item.statuswovw}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text className="text-gray-500 text-center py-4">
                Belum ada aktivitas terbaru
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {user?.statusregister == '1' && user?.faceid === '' && (
        <TouchableOpacity
          className="px-3 py-4 bg-black border-t border-gray-200 mb-4 rounded-full mx-5 flex-row justify-center items-center"
          onPress={() => navigation.navigate('RegisterFace')}
        >
          <ArrowRightToLine
            size={20}
            color="white"
            strokeWidth={2}
            style={{ marginRight: 2 }}
          />
          <Text className="text-white text-lg font-bold ml-2">
            Register Face
          </Text>
        </TouchableOpacity>
      )}

      {user?.faceid && user?.faceid !== '' && user?.statusregister === '0' &&
        (!user?.last_check_out || user?.last_check_out === '') &&
        (!user?.check_out || user?.check_out === '') && (
          <TouchableOpacity
            className="px-3 py-4 bg-black border-t border-gray-200 mb-4 rounded-full mx-5 flex-row justify-center items-center"
            onPress={() =>
              user?.checkin_userid && user?.checkin_userid !== ''
                ? navigation.navigate('ClockOut')
                : navigation.navigate('FaceDetection')
            }
          >
            <ArrowRightToLine
              size={20}
              color="white"
              strokeWidth={2}
              style={{ marginRight: 2 }}
            />
            <Text className="text-white text-lg font-bold ml-2">
              {user?.checkin_userid && user?.checkin_userid !== ''
                ? 'Presensi Keluar'
                : 'Presensi Masuk'}
            </Text>
          </TouchableOpacity>
        )}
    </View>
  );
}
