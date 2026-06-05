import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  PermissionsAndroid,
  Platform,
  RefreshControl,
} from 'react-native';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  CalendarDays,
  LogIn,
  LogOut,
  Layers,
  ScanFace,
} from 'lucide-react-native';
import Geolocation from '@react-native-community/geolocation';
import { useCameraPermission } from 'react-native-vision-camera';
import Storage from '../utils/Storage';
import Api from '../utils/Api';
import { useNavigation } from '@react-navigation/native';

const formatPresensi = dateTimeStr => {
  if (!dateTimeStr || dateTimeStr === '') return null;
  const date = new Date(dateTimeStr.replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateTimeStr;
  const jam = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const tanggal = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return `${tanggal}  ${jam}`;
};

function SectionTitle({ title }) {
  return (
    <View className="flex-row items-center mb-3">
      <View className="w-5 h-5 rounded-md bg-gray-800 items-center justify-center mr-2">
        <View className="w-1.5 h-1.5 bg-white rounded-full" />
      </View>
      <Text
        className="text-[11px] font-extrabold text-gray-500 uppercase"
        style={{ letterSpacing: 1.5 }}
      >
        {title}
      </Text>
      <View className="flex-1 h-px bg-gray-100 ml-3" />
    </View>
  );
}

function StatCard({ title, value, icon: Icon, accentClass, iconColor }) {
  return (
    <View
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex-1"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className={`w-full h-1 ${accentClass}`} />
      <View className="px-4 py-4">
        <View className={`w-9 h-9 rounded-xl items-center justify-center mb-3 ${accentClass.replace('bg-', 'bg-opacity-10 bg-')}`}
          style={{ backgroundColor: `${iconColor}18` }}
        >
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>
        <Text
          className="text-[10px] font-extrabold text-gray-400 uppercase mb-1"
          style={{ letterSpacing: 0.8 }}
        >
          {title}
        </Text>
        <Text className="text-gray-800 text-[26px] font-black leading-tight">
          {value}
        </Text>
      </View>
    </View>
  );
}

function PresensiBlock({ label, value, icon: Icon, isEmpty }) {
  return (
    <View className="flex-1 items-center px-2">
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center mb-2 ${
          isEmpty ? 'bg-gray-100' : 'bg-emerald-50'
        }`}
      >
        <Icon size={16} color={isEmpty ? '#d1d5db' : '#10b981'} strokeWidth={2} />
      </View>
      <Text
        className="text-[10px] font-extrabold text-white/50 uppercase mb-1"
        style={{ letterSpacing: 0.8 }}
      >
        {label}
      </Text>
      <Text
        className={`text-[13px] font-black text-center leading-snug ${
          isEmpty ? 'text-white/30' : 'text-white'
        }`}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

function WorkOrderRow({ item, isLast }) {
  const STATUS_CONFIG = {
    Closed:   { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, color: '#10b981' },
    Progress: { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Clock,        color: '#f59e0b' },
    Open:     { bg: 'bg-red-50',     text: 'text-red-700',     icon: AlertCircle,  color: '#ef4444' },
  };
  const cfg = STATUS_CONFIG[item.statuswovw] ?? STATUS_CONFIG.Open;
  const StatusIcon = cfg.icon;

  const timeStr = item.workerordertime;
  let daysAgoText = '-';
  if (timeStr) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      daysAgoText = diffDays === 0 ? 'Hari ini' : `${diffDays} hari lalu`;
    }
  }

  return (
    <View className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: `${cfg.color}18` }}
      >
        <StatusIcon size={16} color={cfg.color} strokeWidth={2} />
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-gray-800 font-bold text-[13px]" numberOfLines={1}>
          {item.customername || 'Unknown Customer'}
        </Text>
        <Text className="text-gray-400 text-[11px] mt-0.5" numberOfLines={1}>
          {item.complain || '-'} · {daysAgoText}
        </Text>
      </View>
      <View className={`px-2.5 py-1 rounded-full ${cfg.bg}`}>
        <Text className={`text-[10px] font-black uppercase ${cfg.text}`} style={{ letterSpacing: 0.5 }}>
          {item.statuswovw}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ setToken }) {
  const [user, setUser] = useState(null);
  const [allUserEvents, setAllUserEvents] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const [stat, setStats] = useState({
    total: '—',
    open: '—',
    inProgress: '—',
    completed: '—',
  });

  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } =
    useCameraPermission();

  const refreshProfile = async () => {
    try {
      const savedCredentials = await Storage.getCredentials();
      if (!savedCredentials?.username) return null;

      const formData = new FormData();
      formData.append('username', savedCredentials.username);
      formData.append('pass', savedCredentials.password);

      const response = await Api.formDataPost('login', formData);

      if (response?.success && response?.data?.length > 0) {
        await Storage.setProfile(response.data);
        setAllUserEvents(response.data);

        const activeJob =
          response.data.find(
            job => job.check_in && job.check_in !== '' && (!job.check_out || job.check_out === ''),
          ) ||
          response.data.find(job => !job.check_in || job.check_in === '') ||
          response.data[0];

        setUser({ ...activeJob });
        return response.data;
      }
      return null;
    } catch (error) {
      console.log('Error refresh profile:', error);
      return null;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const latestProfile = await refreshProfile();
    await getAllWorkOrders(latestProfile);
    setRefreshing(false);
  }, []);

  const requestAllPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Izin Akses Lokasi',
            message: 'Aplikasi membutuhkan akses lokasi untuk mencatat posisi event',
            buttonPositive: 'Izinkan',
            buttonNegative: 'Nanti',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          Geolocation.getCurrentPosition(
            () => {},
            () => {},
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 },
          );
        }
      } catch (err) {
        console.warn('Location permission error:', err);
      }
    } else {
      Geolocation.requestAuthorization();
    }
    if (!hasCameraPermission) {
      try { await requestCameraPermission(); } catch (err) { console.warn(err); }
    }
  }, [hasCameraPermission, requestCameraPermission]);

  const getAllWorkOrders = async (currentUser = null) => {
    try {
      const data = currentUser || (await Storage.getProfile());
      if (!data?.[0]?.userid) return;

      let page = 1, allData = [], hasMore = true;
      while (hasMore) {
        const response = await Api.post('getworkorder', { loginID: data[0].userid, page, limit: 1000 });
        const chunk = response?.data || [];
        if (chunk.length > 0) { allData = [...allData, ...chunk]; page++; }
        else hasMore = false;
      }

      setStats({
        total: allData.length,
        open: allData.filter(w => w.statuswovw === 'Open').length,
        inProgress: allData.filter(w => w.statuswovw === 'Progress').length,
        completed: allData.filter(w => w.statuswovw === 'Closed').length,
      });

      setWorkOrders(
        [...allData]
          .sort((a, b) => new Date(b.workerordertime) - new Date(a.workerordertime))
          .slice(0, 3),
      );
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
          setAllUserEvents(profile);
          const activeJob =
            profile.find(job => !job.check_out || job.check_out === '') || profile[0];
          setUser({ ...activeJob });
        } else if (profile) {
          setAllUserEvents([profile]);
          setUser({ ...profile });
        }
        const latestProfile = await refreshProfile();
        await getAllWorkOrders(latestProfile);
      };
      loadProfile();
    }, [requestAllPermissions]),
  );

  const canCheckIn = event => {
    if (!event?.startdate) return false;
    const startDate = new Date(event.startdate.replace(' ', 'T'));
    if (isNaN(startDate.getTime())) return false;
    return new Date() >= new Date(startDate.getTime() - 15 * 60 * 1000);
  };

  const canCheckOut = event => {
    if (!event?.enddate) return false;
    const endDate = new Date(event.enddate.replace(' ', 'T'));
    if (isNaN(endDate.getTime())) return false;
    return Date.now() >= endDate.getTime();
  };

  const getPendingEvent = () => {
    if (!allUserEvents?.length) return null;
    const eligible = allUserEvents.filter(
      job => job.faceid && job.faceid !== '' && job.statusregister === '0' && job.traneventid && job.traneventid !== '',
    );
    if (!eligible.length) return null;
    return (
      eligible.find(job => job.check_in && job.check_in !== '' && (!job.check_out || job.check_out === '')) ||
      eligible.find(job => !job.check_in || job.check_in === '') ||
      null
    );
  };

  const pendingEvent = getPendingEvent();
  const needsClockIn = pendingEvent && (!pendingEvent.check_in || pendingEvent.check_in === '');
  const checkInDisabled = needsClockIn && !canCheckIn(pendingEvent);
  const checkOutDisabled = !needsClockIn && !canCheckOut(pendingEvent);
  const buttonDisabled = checkInDisabled || checkOutDisabled;

  const checkInVal = formatPresensi(user?.check_in);
  const checkOutVal = formatPresensi(user?.check_out);

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Dark Header ── */}
      <View
        className="bg-gray-800 pt-14 px-5 pb-6"
        style={{
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        {/* Greeting */}
        <View className="mb-5">
          <Text
            className="text-white/50 text-[10px] font-bold uppercase"
            style={{ letterSpacing: 1.5 }}
          >
            Selamat Datang
          </Text>
          <Text className="text-white text-2xl font-black mt-0.5">
            {user?.employeenama || 'User'}
          </Text>
        </View>

        {/* Event card floating above presensi */}
        <View
          className="bg-white rounded-2xl px-4 py-3.5 mb-3"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-start">
            <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3 mt-0.5">
              <CalendarDays size={16} color="#374151" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text
                className="text-[10px] font-extrabold text-gray-400 uppercase mb-0.5"
                style={{ letterSpacing: 0.8 }}
              >
                Jadwal Aktif
              </Text>
              <Text className="text-gray-800 text-[14px] font-black" numberOfLines={1}>
                {user?.current_event_name || 'Tidak ada jadwal'}
              </Text>
              {user?.event_locations ? (
                <View className="flex-row items-center mt-1">
                  <MapPin size={11} color="#9ca3af" strokeWidth={2} />
                  <Text className="text-gray-400 text-[11px] ml-1 font-medium" numberOfLines={1}>
                    {user.event_locations}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Presensi row */}
        <View className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 flex-row">
          <PresensiBlock
            label="Presensi Masuk"
            value={checkInVal}
            icon={LogIn}
            isEmpty={!checkInVal}
          />
          <View className="w-px bg-white/15 mx-2" />
          <PresensiBlock
            label="Presensi Keluar"
            value={checkOutVal}
            icon={LogOut}
            isEmpty={!checkOutVal}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1f2937']} />
        }
      >
        {/* Stats */}
        <SectionTitle title="Overview" />
        <View className="flex-row gap-3 mb-6">
          <StatCard
            title="Total"
            value={stat.total}
            icon={Briefcase}
            accentClass="bg-indigo-400"
            iconColor="#6366f1"
          />
          <View className="w-3" />
          <StatCard
            title="Progress"
            value={stat.inProgress}
            icon={Clock}
            accentClass="bg-amber-400"
            iconColor="#f59e0b"
          />
          <View className="w-3" />
          <StatCard
            title="Selesai"
            value={stat.completed}
            icon={CheckCircle2}
            accentClass="bg-emerald-400"
            iconColor="#10b981"
          />
        </View>

        {/* Recent Work Orders */}
        <SectionTitle title="Jadwal Terbaru" />
        <View
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {workOrders.length > 0 ? (
            workOrders.map((item, index) => (
              <WorkOrderRow key={index} item={item} isLast={index === workOrders.length - 1} />
            ))
          ) : (
            <View className="items-center py-10">
              <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center mb-3">
                <Layers size={20} color="#d1d5db" strokeWidth={2} />
              </View>
              <Text className="text-gray-400 text-[13px] font-semibold">
                Belum ada aktivitas terbaru
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom CTA Buttons ── */}
      {user?.statusregister == '1' && user?.faceid === '' && (
        <TouchableOpacity
          className="mx-5 mb-4 bg-gray-800 rounded-2xl px-5 py-4 flex-row items-center justify-center border border-gray-700"
          onPress={() => navigation.navigate('RegisterFace')}
          activeOpacity={0.85}
          style={{
            shadowColor: '#111827',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <View className="w-7 h-7 bg-white/15 rounded-xl items-center justify-center mr-2.5">
            <ScanFace size={15} color="white" strokeWidth={2} />
          </View>
          <Text
            className="text-white font-black text-[13px] uppercase"
            style={{ letterSpacing: 1 }}
          >
            Registrasi Wajah
          </Text>
        </TouchableOpacity>
      )}

      {pendingEvent && (
        <TouchableOpacity
          className={`mx-5 mb-4 rounded-2xl px-3 py-3 flex-row items-center justify-center border ${
            buttonDisabled
              ? 'bg-gray-300 border-gray-200'
              : 'bg-gray-800 border-gray-700'
          }`}
          disabled={buttonDisabled}
          onPress={() => {
            if (needsClockIn) {
              navigation.navigate('FaceDetection', { currentEventId: pendingEvent.traneventid });
            } else {
              navigation.navigate('ClockOut', { currentEventId: pendingEvent.traneventid });
            }
          }}
          activeOpacity={0.85}
          style={
            !buttonDisabled
              ? {
                  shadowColor: '#111827',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 4,
                }
              : {}
          }
        >
          <View
            className={`w-7 h-7 rounded-xl items-center justify-center mr-2.5 ${
              buttonDisabled ? 'bg-gray-400/30' : 'bg-white/15'
            }`}
          >
            {needsClockIn
              ? <LogIn size={15} color={buttonDisabled ? '#9ca3af' : 'white'} strokeWidth={2} />
              : <LogOut size={15} color={buttonDisabled ? '#9ca3af' : 'white'} strokeWidth={2} />
            }
          </View>
          <Text
            className={`font-black text-[13px] uppercase ${
              buttonDisabled ? 'text-gray-400' : 'text-white'
            }`}
            style={{ letterSpacing: 1 }}
          >
            {needsClockIn
              ? checkInDisabled ? 'Belum Waktu Masuk' : 'Presensi Masuk'
              : checkOutDisabled ? 'Belum Waktu Keluar' : 'Presensi Keluar'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}