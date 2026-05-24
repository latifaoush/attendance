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
import { ArrowLeft, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import Api from '../utils/Api';

function InfoCard({ icon, label, value, valueColor = 'text-gray-900' }) {
  return (
    <View className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 mb-3 border border-gray-100">
      <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-gray-400 mb-0.5">{label}</Text>
        <Text className={`text-[15px] font-semibold ${valueColor}`}>{value || '-'}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title }) {
  return (
    <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-5 px-1">
      {title}
    </Text>
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

  // --- Parsing tanggal ---
  const dateObj = item ? new Date(item.leavedate) : null;
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const fullDate = dateObj
    ? `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`
    : '-';

  const checkInTime = item?.check_in ? item.check_in.substring(11, 16) : null;
  const checkOutTime = item?.check_out ? item.check_out.substring(11, 16) : null;
  const isLate = !!item?.late_duration;
  const isOvertime = !!item?.overtime_duration;
  const hasLocation = item?.latitude && item?.longitude;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-[52px] pb-[14px] border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 items-center justify-center"
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-[15px] font-bold text-gray-900">Detail Absensi</Text>
        <View className="w-9 h-9" />
      </View>

      {/* Loading */}
      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-400 mt-3 text-sm">Memuat detail...</Text>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-base text-center">{error}</Text>
          <TouchableOpacity
            className="mt-4 bg-indigo-600 px-6 py-2.5 rounded-xl"
            onPress={fetchDetail}
          >
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!loading && !error && item && (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner Tanggal */}
          <View className="bg-gray-600 rounded-2xl px-5 py-5 mb-2">
            <Text className="text-indigo-200 text-[12px] font-medium mb-1">{type}</Text>
            <Text className="text-white text-[20px] font-extrabold mb-3">{fullDate}</Text>
            <View className="flex-row mt-3 gap-2">
              {isLate && (
                <View className="bg-black rounded-full px-3 py-1">
                  <Text className="text-white text-[11px] font-semibold">Terlambat</Text>
                </View>
              )}
              {isOvertime && (
                <View className="bg-yellow-400 rounded-full px-3 py-1">
                  <Text className="text-white text-[11px] font-semibold">Lembur</Text>
                </View>
              )}
              {!isLate && !isOvertime && (
                <View className="bg-green-500 rounded-full px-3 py-1">
                  <Text className="text-white text-[11px] font-semibold">Tepat Waktu</Text>
                </View>
              )}
            </View>
          </View>

          {/* Waktu Absensi */}
          <SectionTitle title="Waktu Absensi" />
          <InfoCard
            icon={<Clock size={18} color="#4f46e5" />}
            label="Jam Masuk"
            value={checkInTime ?? 'Belum absen masuk'}
            valueColor={isLate ? 'text-red-500' : 'text-gray-900'}
          />
          {item.late_duration && (
            <InfoCard
              icon={<AlertCircle size={18} color="#f97316" />}
              label="Durasi Terlambat"
              value={item.late_duration}
              valueColor="text-orange-500"
            />
          )}
          <InfoCard
            icon={<Clock size={18} color="#4f46e5" />}
            label="Jam Keluar"
            value={checkOutTime ?? 'Belum absen keluar'}
          />
          {item.overtime_duration && (
            <InfoCard
              icon={<CheckCircle size={18} color="#eab308" />}
              label="Durasi Lembur"
              value={item.overtime_duration}
              valueColor="text-yellow-500"
            />
          )}

          {/* Lokasi */}
          <SectionTitle title="Lokasi" />
          <InfoCard
            icon={<MapPin size={18} color="#4f46e5" />}
            label="Latitude"
            value={item.latitude ?? 'Tidak tersedia'}
          />
          <InfoCard
            icon={<MapPin size={18} color="#4f46e5" />}
            label="Longitude"
            value={item.longitude ?? 'Tidak tersedia'}
          />
          {hasLocation && (
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3.5 mb-3 flex-row items-center justify-center"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps?q=${item.latitude},${item.longitude}`,
                )
              }
            >
              <MapPin size={16} color="#4f46e5" />
              <Text className="text-indigo-600 font-semibold ml-2">Lihat di Google Maps</Text>
            </TouchableOpacity>
          )}

          {/* Foto Absensi */}
          <SectionTitle title="Foto Absensi" />
          {item.pict_url ? (
            <View className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-3">
              <Image
                source={{ uri: item.pict_url }}
                className="w-full h-64"
                resizeMode="cover"
              />
              <View className="px-4 py-3">
                <Text className="text-[12px] text-gray-400 text-center">
                  Foto saat {type === 'Masuk' ? 'clock-in' : 'clock-out'}
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-white rounded-2xl px-4 py-8 mb-3 items-center border border-gray-100">
              <Text className="text-gray-300 text-[40px]">📷</Text>
              <Text className="text-gray-400 text-sm mt-2">Foto tidak tersedia</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}