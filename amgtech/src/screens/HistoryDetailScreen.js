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
  Camera,
  Calendar,
  Navigation,
  Layers,
  Tag,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import Api from '../utils/Api';

function SectionTitle({ title, icon }) {
  return (
    <View className="flex-row items-center mb-3 mt-7">
      <View className="w-5 h-5 rounded-md bg-gray-800 items-center justify-center mr-2">
        {icon ?? <View className="w-1.5 h-1.5 bg-white rounded-full" />}
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

function TimeBlock({ label, time, isEmpty, isLate, isOvertime }) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl items-center border border-gray-100 overflow-hidden"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Top color strip */}
      <View
        className={`w-full h-1 ${
          isEmpty ? 'bg-gray-200' : isLate ? 'bg-red-400' : isOvertime ? 'bg-orange-400' : 'bg-emerald-400'
        }`}
      />

      <View className="px-4 py-4 items-center w-full">
        <Text
          className="text-[10px] font-extrabold text-gray-400 uppercase mb-3"
          style={{ letterSpacing: 0.8 }}
        >
          {label}
        </Text>

        <View
          className={`w-12 h-12 rounded-2xl items-center justify-center mb-2.5 ${
            isEmpty ? 'bg-gray-100' : isLate ? 'bg-red-50' : isOvertime ? 'bg-orange-50' : 'bg-emerald-50'
          }`}
        >
          <Clock
            size={20}
            color={isEmpty ? '#d1d5db' : isLate ? '#ef4444' : isOvertime ? '#f97316' : '#10b981'}
          />
        </View>

        <Text
          className={`text-[26px] font-black ${
            isEmpty
              ? 'text-gray-300'
              : isLate
              ? 'text-red-500'
              : isOvertime
              ? 'text-orange-500'
              : 'text-gray-800'
          }`}
        >
          {isEmpty ? '--:--' : time}
        </Text>

        <View
          className={`mt-2 px-2.5 py-0.5 rounded-full ${
            isEmpty ? 'bg-gray-100' : isLate ? 'bg-red-50' : isOvertime ? 'bg-orange-50' : 'bg-emerald-50'
          }`}
        >
          <Text
            className={`text-[9px] font-black uppercase ${
              isEmpty
                ? 'text-gray-400'
                : isLate
                ? 'text-red-500'
                : isOvertime
                ? 'text-orange-500'
                : 'text-emerald-600'
            }`}
            style={{ letterSpacing: 0.5 }}
          >
            {isEmpty ? 'Belum absen' : isLate ? 'Terlambat' : isOvertime ? 'Lembur' : 'Tepat waktu'}
          </Text>
        </View>
      </View>
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

      const response = await Api.getLeaveDetail(leaveid, type);
      
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
  }, [leaveid, type]);

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
  const hasLocation = item?.active_latitude && item?.active_longitude;

  return (
    <View className="flex-1 bg-gray-50">
      <View
        className="bg-gray-800 pt-14 pb-6 px-5"
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
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 bg-white/10 rounded-xl items-center justify-center mr-3 border border-white/10"
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="text-white/50 text-[10px] font-bold uppercase"
              style={{ letterSpacing: 1.5 }}
            >
              Rekap Kehadiran
            </Text>
            <Text className="text-white text-xl font-black mt-0.5">
              Detail Absensi
            </Text>
          </View>
        </View>

        {item && (
          <View className="bg-white/10 rounded-2xl px-4 py-3 flex-row items-center border border-white/10">
            <View className="w-8 h-8 bg-white/15 rounded-xl items-center justify-center mr-3">
              <Calendar size={16} color="rgba(255,255,255,0.9)" />
            </View>
            <View className="flex-1">
              <Text
                className="text-white/50 text-[10px] font-bold uppercase mb-0.5"
                style={{ letterSpacing: 1 }}
              >
                {type}
              </Text>
              <Text className="text-white text-[15px] font-extrabold">
                {fullDate}
              </Text>
            </View>
          </View>
        )}
      </View>

      {loading && (
        <View className="flex-1 items-center justify-center">
          <View
            className="w-16 h-16 bg-white rounded-2xl items-center justify-center border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <ActivityIndicator size="large" color="#1f2937" />
          </View>
          <Text className="text-gray-400 mt-4 text-[13px] font-semibold">
            Memuat detail…
          </Text>
        </View>
      )}

      {!loading && error && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-red-50 rounded-2xl items-center justify-center mb-4 border border-red-100">
            <Text className="text-3xl"></Text>
          </View>
          <Text className="text-gray-800 text-base font-black text-center mb-1.5">
            Oops, terjadi masalah
          </Text>
          <Text className="text-gray-400 text-[13px] text-center leading-relaxed mb-7">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-gray-800 px-10 py-3.5 rounded-2xl border border-gray-700"
            onPress={fetchDetail}
            activeOpacity={0.8}
            style={{
              shadowColor: '#111827',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text
              className="text-white font-black text-[13px] uppercase"
              style={{ letterSpacing: 1 }}
            >
              Coba Lagi
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && item && (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 52 }}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle title="Waktu Absensi" />
          <View className="flex-row gap-3">
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
              isOvertime={isOvertime}
            />
          </View>

          <SectionTitle title="Informasi Acara" />
          <View
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-2"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
                <Layers size={16} color="#4b5563" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Tahap
                </Text>
                <Text className="text-[14px] font-bold text-gray-800 font-mono">
                  {item.eventtypeid === '0'
                    ? 'Setup'
                    : item.eventtypeid === '1'
                    ? 'Event'
                    : item.eventtypeid === '2'
                    ? 'Bongkar'
                    : 'Lainnya'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center px-4 py-3.5">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
                <Tag size={16} color="#4b5563" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Nama Acara
                </Text>
                <Text className="text-[14px] font-bold text-gray-800 font-mono">
                  {item.eventname ?? '—'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center px-4 py-3.5">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
                <MapPin size={16} color="#4b5563" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Lokasi Acara
                </Text>
                <Text className="text-[14px] font-bold text-gray-800 font-mono">
                  {item.locations ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          <SectionTitle title="Lokasi Absensi" />
          <View
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-2"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
                <MapPin size={16} color="#4b5563" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Latitude
                </Text>
                <Text className="text-[14px] font-bold text-gray-800 font-mono">
                  {item.latitude ?? '—'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center px-4 py-3.5">
              <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
                <MapPin size={16} color="#4b5563" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Longitude
                </Text>
                <Text className="text-[14px] font-bold text-gray-800 font-mono">
                  {item.longitude ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          {hasLocation && (
            <TouchableOpacity
              activeOpacity={0.85}
              className="bg-gray-800 rounded-2xl px-3 py-2 mb-2 flex-row items-center justify-center border border-gray-700"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps?q=${item.active_latitude},${item.active_longitude}`,
                )
              }
              style={{
                shadowColor: '#111827',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="w-7 h-7 bg-white/15 rounded-xl items-center justify-center mr-2.5">
                <Navigation size={15} color="white" />
              </View>
              <Text
                className="text-white font-black text-[13px] uppercase"
                style={{ letterSpacing: 1 }}
              >
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
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <Image
                source={{ uri: item.pict_url }}
                className="w-full h-64"
                resizeMode="cover"
              />
              {/* Footer bar */}
              <View className="px-4 py-3 flex-row items-center bg-gray-50 border-t border-gray-100">
                <View className="w-6 h-6 bg-gray-200 rounded-lg items-center justify-center mr-2">
                  <Camera size={12} color="#6b7280" />
                </View>
                <Text className="text-[12px] text-gray-500 font-semibold flex-1">
                  Foto Absensi
                </Text>
              </View>
            </View>
          ) : (
            <View
              className="bg-white rounded-3xl px-4 py-12 mb-3 items-center border border-dashed border-gray-200"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center mb-3">
                <Camera size={26} color="#d1d5db" />
              </View>
              <Text className="text-gray-500 text-[14px] font-bold mb-1">
                Foto tidak tersedia
              </Text>
              <Text className="text-gray-300 text-[12px]">
                Tidak ada foto yang diunggah
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
