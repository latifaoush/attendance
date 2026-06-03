import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Clock,
  MapPin,
  CheckCircle,
  Camera,
  Calendar,
  Navigation,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import Api from '../utils/Api';

function InfoCard({
  icon,
  label,
  value,
  valueColor = 'text-gray-800',
  accent = false,
}) {
  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 py-4 mb-2.5 ${
        accent
          ? 'bg-gray-50 border border-gray-200'
          : 'bg-white border border-gray-100'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View
        className={`w-10 h-10 rounded-2xl items-center justify-center mr-3.5 ${
          accent ? 'bg-gray-100' : 'bg-gray-50'
        }`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-medium text-gray-400 mb-0.5 tracking-wide uppercase">
          {label}
        </Text>
        <Text className={`text-[15px] font-bold ${valueColor}`}>
          {value || '-'}
        </Text>
      </View>
    </View>
  );
}

function SectionTitle({ title }) {
  return (
    <View className="flex-row items-center mb-3 mt-6 px-1">
      <View className="w-1 h-4 bg-gray-500 rounded-full mr-2" />
      <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
        {title}
      </Text>
    </View>
  );
}

function TimeBlock({ label, time, isEmpty, isLate }) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl px-4 py-4 items-center border border-gray-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        {label}
      </Text>
      {isEmpty ? (
        <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
          <Clock size={18} color="#d1d5db" />
        </View>
      ) : (
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${
            isLate ? 'bg-red-50' : 'bg-green-50'
          }`}
        >
          <Clock size={18} color={isLate ? '#ef4444' : '#22c55e'} />
        </View>
      )}
      <Text
        className={`text-[22px] font-extrabold mt-1 ${
          isEmpty ? 'text-gray-300' : isLate ? 'text-red-500' : 'text-gray-800'
        }`}
      >
        {isEmpty ? '--:--' : time}
      </Text>
      {/* {isLate && !isEmpty && (
        <View className="mt-1.5 bg-red-100 px-2 py-0.5 rounded-full">
          <Text className="text-[10px] font-bold text-red-500">TERLAMBAT</Text>
        </View>
      )} */}
      {/* {!isLate && !isEmpty && (
        <View className="mt-1.5 bg-green-100 px-2 py-0.5 rounded-full">
          <Text className="text-[10px] font-bold text-green-500">ON TIME</Text>
        </View>
      )} */}
      {isEmpty && (
        <Text className="text-[10px] text-gray-400 mt-1">Belum absen</Text>
      )}
    </View>
  );
}

export default function HistoryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { leaveid, type } = route.params ?? {};

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await Api.getLeaveDetail(leaveid);

      if (response?.success && response?.data?.length > 0) {
        setItem(response.data[0]);
      } else {
        setError(response?.pesan ?? 'Data tidak ditemukan.');
      }
    } catch (err) {
      console.log('Error fetch detail:', err);
      setError('Gagal memuat data. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [leaveid]);

  useEffect(() => {
    if (leaveid) fetchDetail();
  }, [fetchDetail]);

  const dateObj = item ? new Date(item.leavedate) : null;
  const dayNames = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
  ];
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const fullDate = dateObj
    ? `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${
        monthNames[dateObj.getMonth()]
      } ${dateObj.getFullYear()}`
    : '-';

  const checkInTime = item?.check_in ? item.check_in.substring(11, 16) : null;
  const checkOutTime = item?.check_out
    ? item.check_out.substring(11, 16)
    : null;
  const isLate = !!item?.late_duration;
  const isOvertime = !!item?.overtime_duration;
  const hasLocation = item?.latitude && item?.longitude;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-gray-500 pt-14 pb-5 px-5 rounded-b-[32px] shadow-xl"
        style={{
          shadowColor: '#374151',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-2xl items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white/70 text-[11px] font-semibold uppercase tracking-widest">
              Rekap Kehadiran
            </Text>
            <Text className="text-white text-xl font-extrabold mt-0.5">
              Detail Absensi
            </Text>
          </View>
        </View>
      </View>

      {/* Date Banner */}
      {item && (
        <View className="mx-5 mt-4">
          <View
            className="bg-white rounded-2xl px-4 py-4 flex-row items-center border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View className="w-10 h-10 bg-gray-100 rounded-2xl items-center justify-center mr-3.5">
              <Calendar size={18} color="#374151" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-0.5">
                {type}
              </Text>
              <Text className="text-gray-800 text-[16px] font-extrabold">
                {fullDate}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View className="flex-1 items-center justify-center">
          <View
            className="w-16 h-16 bg-white rounded-3xl items-center justify-center"
            style={{
              shadowColor: '#374151',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <ActivityIndicator size="large" color="#4b5563" />
          </View>
          <Text className="text-gray-400 mt-4 text-sm font-medium">
            Memuat detail...
          </Text>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-red-50 rounded-3xl items-center justify-center mb-4">
            <Text className="text-3xl">⚠️</Text>
          </View>
          <Text className="text-gray-700 text-base font-semibold text-center mb-1">
            Oops, terjadi masalah
          </Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-gray-700 px-8 py-3 rounded-2xl"
            onPress={fetchDetail}
            activeOpacity={0.8}
            style={{
              shadowColor: '#374151',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold text-sm">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!loading && !error && item && (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Waktu Absensi - Time blocks side by side */}
          <SectionTitle title="Waktu Absensi" />
          <View className="flex-row gap-3 mb-2.5">
            <TimeBlock
              label="Jam Masuk"
              time={checkInTime}
              isEmpty={!checkInTime}
              isLate={isLate}
            />
            <View className="w-3" />
            <TimeBlock
              label="Jam Keluar"
              time={checkOutTime}
              isEmpty={!checkOutTime}
              isLate={false}
            />
          </View>
{/* 
          {item.overtime_duration && (
            <InfoCard
              icon={<CheckCircle size={18} color="#eab308" />}
              label="Durasi Lembur"
              value={item.overtime_duration}
              valueColor="text-yellow-600"
              accent={false}
            />
          )} */}

          <SectionTitle title="Informasi Event" />
         <View>
           <InfoCard
            icon={<MapPin size={18} color="#4b5563" />}
            label="Tahap"
            value={item.eventtypeid === '0' ? 'Setup' 
              : item.eventtypeid === '1' ? 'Event'
              : item.eventtypeid === '2' ? 'Bongkar' : 'Lainnya'}
          />
          <InfoCard
            icon={<MapPin size={18} color="#4b5563" />}
            label="Nama Event"
            value={item.eventname ?? 'Tidak tersedia'}
          />
          <InfoCard
            icon={<MapPin size={18} color="#4b5563" />}
            label="Lokasi"
            value={item.locations ?? 'Tidak tersedia'}
          />
          <InfoCard
            icon={<MapPin size={18} color="#4b5563" />}
            label="Customer"
            value={item.customer ?? 'Tidak tersedia'}
          />
         </View>

          {/* Lokasi */}
          <SectionTitle title="Lokasi" />
          <InfoCard
            icon={<MapPin size={18} color="#4b5563" />}
            label="Latitude"
            value={item.latitude ?? 'Tidak tersedia'}
          />
          <InfoCard
            icon={<MapPin size={18} color="#4b5563" />}
            label="Longitude"
            value={item.longitude ?? 'Tidak tersedia'}
          />
          {hasLocation && (
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-gray-700 rounded-2xl px-4 py-4 mb-2.5 flex-row items-center justify-center"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps?q=${item.latitude},${item.longitude}`,
                )
              }
              style={{
                shadowColor: '#374151',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Navigation size={16} color="white" />
              <Text className="text-white font-bold ml-2 text-[14px]">
                Lihat di Google Maps
              </Text>
            </TouchableOpacity>
          )}

          {/* Foto Absensi */}
          <SectionTitle title="Foto Absensi" />
          {item.pict_url ? (
            <View
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 mb-3"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Image
                source={{ uri: item.pict_url }}
                className="w-full h-64"
                resizeMode="cover"
              />
              <View className="px-4 py-3 flex-row items-center justify-center">
                <Camera size={13} color="#9ca3af" />
                <Text className="text-[12px] text-gray-400 ml-1.5 font-medium">
                  Foto Absensi
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-white rounded-3xl px-4 py-10 mb-3 items-center border border-dashed border-gray-200">
              <View className="w-16 h-16 bg-gray-50 rounded-2xl items-center justify-center mb-3">
                <Camera size={28} color="#d1d5db" />
              </View>
              <Text className="text-gray-400 text-sm font-medium">
                Foto tidak tersedia
              </Text>
              <Text className="text-gray-300 text-[11px] mt-1">
                Tidak ada foto yang diunggah
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
