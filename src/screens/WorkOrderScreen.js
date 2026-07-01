import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Search,
  X,
  Calendar,
  MapPin,
  User,
  Clock,
  CalendarDays,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Api from '../utils/Api';
import Storage from '../utils/Storage';

// Fungsi format tanggal untuk tampilan kartu kerja
const formatDate = raw => {
  if (!raw || raw === '-') return '-';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
};

const EVENT_TYPE_LABEL = {
  '0': 'Setup',
  '1': 'Event',
  '2': 'Bongkar',
  '3': 'Antar',
  '4': 'Tarik',
};

const EVENT_TYPE_COLOR = {
  '0': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '1': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  '2': { bg: 'bg-red-100', text: 'text-red-700' },
  '3': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '4': { bg: 'bg-purple-100', text: 'text-purple-700' },
};

// ── KOMPONEN KARTU JADWAL (CARD) ──
function ScheduleCard({ item, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const typeLabel = EVENT_TYPE_LABEL[item.eventtype] ?? 'Other';
  const typeColor = EVENT_TYPE_COLOR[item.eventtype] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-3">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View
          className={`w-full h-1 ${
            item.eventtype === '0'
              ? 'bg-blue-400'
              : item.eventtype === '1'
              ? 'bg-emerald-400'
              : item.eventtype === '2'
              ? 'bg-red-400'
              : item.eventtype === '3'
              ? 'bg-orange-400'
              : item.eventtype === '4'
              ? 'bg-purple-400'
              : 'bg-gray-300'
          }`}
        />

        <View className="px-4 pt-4 pb-3">
          <View className="flex-row items-start mb-3">
            <View className={`px-2.5 py-1 rounded-lg mr-2.5 mt-0.5 ${typeColor.bg}`}>
              <Text
                className={`text-[10px] font-extrabold uppercase ${typeColor.text}`}
                style={{ letterSpacing: 0.8 }}
              >
                {typeLabel}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              className="text-gray-900 font-bold text-[15px] flex-1 leading-snug"
            >
              {item.eventname}
            </Text>
          </View>

          <View className="space-y-1.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center mr-2.5">
                <User size={12} color="#6b7280" strokeWidth={2} />
              </View>
              <Text numberOfLines={1} className="text-gray-600 text-[13px] flex-1 font-medium">
                {item.customer}
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center mr-2.5">
                <MapPin size={12} color="#6b7280" strokeWidth={2} />
              </View>
              <Text numberOfLines={1} className="text-gray-600 text-[13px] flex-1 font-medium">
                {item.locations}
              </Text>
            </View>
          </View>

          <View className="h-px bg-gray-100 my-3" />

          <View className="flex-row gap-2">
            <View className="flex-1 flex-row items-center bg-gray-50 rounded-xl px-3 py-2">
              <Calendar size={12} color="#3b82f6" strokeWidth={2} />
              <Text className="text-gray-700 text-[11px] ml-1.5 font-semibold flex-1" numberOfLines={1}>
                {formatDate(item.startdate)}
              </Text>
            </View>
            <View className="w-2" />
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Clock size={12} color="#6b7280" strokeWidth={2} />
              <Text className="text-gray-600 text-[11px] ml-1.5 font-semibold flex-1" numberOfLines={1}>
                {formatDate(item.enddate)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WorkOrderScreen({ navigation }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // Filter jenis tugas
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL | TODAY | TOMORROW | CUSTOM
  const [customDate, setCustomDate] = useState(new Date()); // Tanggal pilihan kalender
  const [showDatePicker, setShowDatePicker] = useState(false); // Validasi tampil Android Picker

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await Storage.getProfile();
      const userId = profile?.[0]?.userid;

      if (!userId) {
        console.warn('[Schedule] userId tidak ditemukan di Storage');
        return;
      }

      const formData = new FormData();
      formData.append('userid', userId);

      const response = await Api.getScheduleList(formData);

      if (response?.success && Array.isArray(response.data)) {
        setSchedules(response.data);
        setTotalCount(response.totalCount ?? response.data.length);
      } else {
        setSchedules([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.warn('[Schedule] fetchSchedules error:', error?.message ?? error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedules();
    setRefreshing(false);
  };

  // ── LOGIKA FILTER UTAMA (Kombinasi Jenis, Teks, & Tanggal) ──
  const filteredData = useMemo(() => {
    const hariIni = new Date();
    const besok = new Date();
    besok.setDate(hariIni.getDate() + 1);

    // Konversi objek tanggal ke string format 'YYYY-MM-DD'
    const formatStringDate = d => d.toISOString().split('T')[0];

    const strHariIni = formatStringDate(hariIni);
    const strBesok = formatStringDate(besok);
    const strCustom = formatStringDate(customDate);

    return schedules.filter(item => {
      // 1. Penyaringan Tombol Jenis Kerja (Setup, Event, dll)
      if (selectedFilter !== 'ALL' && String(item.eventtype) !== selectedFilter) {
        return false;
      }

      // 2. Penyaringan Berdasarkan Tanggal Kerja
      if (item.startdate) {
        const itemDateStr = item.startdate.split(' ')[0]; // Mengambil pecahan 'YYYY-MM-DD' saja dari DB

        if (dateFilter === 'TODAY' && itemDateStr !== strHariIni) return false;
        if (dateFilter === 'TOMORROW' && itemDateStr !== strBesok) return false;
        if (dateFilter === 'CUSTOM' && itemDateStr !== strCustom) return false;
      }

      // 3. Penyaringan Berdasarkan Search Bar
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.eventname?.toLowerCase().includes(q) ||
        item.customer?.toLowerCase().includes(q) ||
        item.locations?.toLowerCase().includes(q)
      );
    });
  }, [schedules, searchQuery, selectedFilter, dateFilter, customDate]);

  // Handler khusus untuk menutup dialog Android Date Picker setelah memilih tanggal
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false); // Sembunyikan picker (Standar Android)
    if (event.type === 'set' && selectedDate) {
      setCustomDate(selectedDate);
      setDateFilter('CUSTOM');
    }
  };

  const handlePressCard = item => {
    navigation.navigate('WorkOrderDetail', { id: item.traneventid });
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── HEADER ── */}
      <View
        className="bg-gray-800 pt-14 pb-8 px-5"
        style={{
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          elevation: 8,
        }}
      >
        <View className="flex-row items-center mb-1">
          <View className="flex-1">
            <Text className="text-white/50 text-[10px] font-bold uppercase" style={{ letterSpacing: 1.5 }}>
              Jadwal Kerja Crew LED
            </Text>
            <Text className="text-white text-2xl font-black mt-0.5">
              Daftar Jadwal
            </Text>
          </View>
          <View className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2 items-center">
            <Text className="text-white text-[18px] font-black leading-none">
              {filteredData.length}
            </Text>
            <Text className="text-white/50 text-[9px] font-bold uppercase mt-0.5" style={{ letterSpacing: 0.8 }}>
              Tersaring
            </Text>
          </View>
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View className="px-5 -mt-5 mb-3">
        <View
          className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100"
          style={{ elevation: 4 }}
        >
          <Search size={18} color="#9ca3af" strokeWidth={2.5} />
          <TextInput
            placeholder="Cari event, customer, lokasi..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-[14px] text-gray-800 font-medium p-0 m-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center"
            >
              <X size={13} color="#6b7280" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── FILTER TANGGAL (BARIS 1) ── */}
      <View className="mb-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          data={[
            { id: 'ALL', label: 'Semua Tanggal' },
            { id: 'TODAY', label: 'Hari Ini' },
            { id: 'TOMORROW', label: 'Besok' },
            { 
              id: 'PICKER', 
              label: dateFilter === 'CUSTOM' 
                ? customDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) 
                : 'Pilih Tanggal' 
            }
          ]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isSelected = dateFilter === item.id || (item.id === 'PICKER' && dateFilter === 'CUSTOM');
            return (
              <TouchableOpacity
                onPress={() => {
                  if (item.id === 'PICKER') {
                    setShowDatePicker(true);
                  } else {
                    setDateFilter(item.id);
                  }
                }}
                className={`mr-2 px-4 py-2 rounded-xl border ${
                  isSelected ? 'bg-gray-600 border-gray-600' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── FILTER JENIS TUGAS (BARIS 2) ── */}
      <View className="mb-4">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          data={['ALL', '0', '1', '2', '3', '4']}
          keyExtractor={item => item}
          renderItem={({ item }) => {
            const label = item === 'ALL' ? 'Semua Tahap' : EVENT_TYPE_LABEL[item];
            const isSelected = selectedFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedFilter(item)}
                className={`mr-2 px-4 py-1.5 rounded-xl border ${
                  isSelected ? 'bg-gray-600 border-gray-600' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── ANDROID NATIVE DATE PICKER ── */}
      {showDatePicker && (
        <DateTimePicker
          value={customDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      )}

      {/* ── DAFTAR JADWAL (MAIN CONTENT) ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.traneventid}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 70 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ScheduleCard item={item} onPress={() => handlePressCard(item)} />
          )}
          ListHeaderComponent={
            filteredData.length > 0 ? (
              <View className="flex-row items-center mb-3 mt-1">
                <Text className="text-[11px] font-extrabold text-gray-500 uppercase" style={{ letterSpacing: 1.5 }}>
                  {searchQuery || selectedFilter !== 'ALL' || dateFilter !== 'ALL'
                    ? `${filteredData.length} hasil pencarian`
                    : 'Semua Jadwal'}
                </Text>
                <View className="flex-1 h-px bg-gray-100 ml-3" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center mt-20 px-8">
              <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mb-4 border border-gray-100" style={{ elevation: 2 }}>
                <CalendarDays size={26} color="#d1d5db" strokeWidth={2} />
              </View>
              <Text className="text-gray-800 text-[15px] font-black text-center mb-1">
                Jadwal tidak ditemukan
              </Text>
              <Text className="text-gray-400 text-[13px] text-center leading-relaxed">
                Tidak ada jadwal pas dengan kriteria filter Anda.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}