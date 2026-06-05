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
import Api from '../utils/Api';
import Storage from '../utils/Storage';

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
        {/* Top color strip based on event type */}
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
          {/* Event name + type badge */}
          <View className="flex-row items-start mb-3">
            <View
              className={`px-2.5 py-1 rounded-lg mr-2.5 mt-0.5 ${typeColor.bg}`}
            >
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

          {/* Info rows */}
          <View className="space-y-1.5">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center mr-2.5">
                <User size={12} color="#6b7280" strokeWidth={2} />
              </View>
              <Text
                numberOfLines={1}
                className="text-gray-600 text-[13px] flex-1 font-medium"
              >
                {item.customer}
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center mr-2.5">
                <MapPin size={12} color="#6b7280" strokeWidth={2} />
              </View>
              <Text
                numberOfLines={1}
                className="text-gray-600 text-[13px] flex-1 font-medium"
              >
                {item.locations}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-100 my-3" />

          {/* Date chips */}
          <View className="flex-row gap-2">
            <View className="flex-1 flex-row items-center bg-blue-50 rounded-xl px-3 py-2">
              <Calendar size={12} color="#3b82f6" strokeWidth={2} />
              <Text
                className="text-blue-700 text-[11px] ml-1.5 font-semibold flex-1"
                numberOfLines={1}
              >
                {formatDate(item.startdate)}
              </Text>
            </View>
            <View className="w-2" />
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Clock size={12} color="#6b7280" strokeWidth={2} />
              <Text
                className="text-gray-600 text-[11px] ml-1.5 font-semibold flex-1"
                numberOfLines={1}
              >
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
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

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

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase();
    return schedules.filter(
      item =>
        item.eventname?.toLowerCase().includes(q) ||
        item.customer?.toLowerCase().includes(q) ||
        item.locations?.toLowerCase().includes(q),
    );
  }, [schedules, searchQuery]);

  const handlePressCard = item => {
    navigation.navigate('WorkOrderDetail', { id: item.traneventid });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View
        className="bg-gray-800 pt-14 pb-8 px-5"
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
        <View className="flex-row items-center mb-1">
          <View className="flex-1">
            <Text
              className="text-white/50 text-[10px] font-bold uppercase"
              style={{ letterSpacing: 1.5 }}
            >
              Work Order
            </Text>
            <Text className="text-white text-2xl font-black mt-0.5">
              Daftar Jadwal
            </Text>
          </View>
          {/* Total count badge */}
          <View className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2 items-center">
            <Text className="text-white text-[18px] font-black leading-none">
              {totalCount}
            </Text>
            <Text
              className="text-white/50 text-[9px] font-bold uppercase mt-0.5"
              style={{ letterSpacing: 0.8 }}
            >
              Jadwal
            </Text>
          </View>
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View className="px-5 -mt-5 mb-3">
        <View
          className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Search size={18} color="#9ca3af" strokeWidth={2.5} />
          <TextInput
            placeholder="Cari event, customer, lokasi..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-[14px] text-gray-800 font-medium"
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

      {/* ── Content ── */}
      {loading ? (
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
            Memuat jadwal…
          </Text>
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
                <View className="w-5 h-5 rounded-md bg-gray-800 items-center justify-center mr-2">
                  <View className="w-1.5 h-1.5 bg-white rounded-full" />
                </View>
                <Text
                  className="text-[11px] font-extrabold text-gray-500 uppercase"
                  style={{ letterSpacing: 1.5 }}
                >
                  {searchQuery ? `${filteredData.length} hasil pencarian` : 'Semua Jadwal'}
                </Text>
                <View className="flex-1 h-px bg-gray-100 ml-3" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center mt-20 px-8">
              <View
                className="w-16 h-16 bg-white rounded-2xl items-center justify-center mb-4 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <CalendarDays size={26} color="#d1d5db" strokeWidth={2} />
              </View>
              <Text className="text-gray-800 text-[15px] font-black text-center mb-1">
                Jadwal tidak ditemukan
              </Text>
              <Text className="text-gray-400 text-[13px] text-center leading-relaxed">
                {searchQuery
                  ? 'Coba kata kunci yang berbeda'
                  : 'Tarik ke bawah untuk memperbarui'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}