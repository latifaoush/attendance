// WorkOrderScreen.jsx
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
import { Search, X, Calendar, MapPin, User, Clock } from 'lucide-react-native';
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

function ScheduleCard({ item, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }] }}
      className="mb-3"
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="bg-white shadow-md rounded-2xl p-4 border border-gray-100"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center flex-1">
            <View className="bg-gray-100 rounded-xl px-2 h-10 items-center justify-center mr-3">
              <Text className="text-gray-600 font-bold text-xs" numberOfLines={1}>
                {item.eventtype === '0'
                  ? 'Setup'
                  : item.eventtype === '2'
                  ? 'Bongkar'
                  : item.eventtype === '1'
                  ? 'Event'
                  : 'Other'}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              className="text-gray-900 font-bold text-base flex-1"
            >
              {item.eventname}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-1 bg-gray-50 px-3 py-2 rounded-lg">
          <User size={14} color="#6b7280" strokeWidth={2} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-gray-600 text-sm flex-1 ml-2"
          >
            {item.customer}
          </Text>
        </View>

        <View className="flex-row items-center mb-1 bg-gray-50 px-3 py-2 rounded-lg">
          <MapPin size={14} color="#6b7280" strokeWidth={2} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-gray-600 text-sm flex-1 ml-2"
          >
            {item.locations}
          </Text>
        </View>

        <View className="border-b border-gray-200 my-2" />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-lg flex-1 mr-2">
            <Calendar size={13} color="#3b82f6" strokeWidth={2} />
            <Text className="text-blue-700 text-xs ml-1.5 font-medium">
              {formatDate(item.startdate)}
            </Text>
          </View>
          <View className="flex-row items-center bg-purple-50 px-3 py-1.5 rounded-lg flex-1">
            <Clock size={13} color="#7c3aed" strokeWidth={2} />
            <Text className="text-purple-700 text-xs ml-1.5 font-medium">
              {formatDate(item.enddate)}
            </Text>
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
      <View className="bg-gray-800 pt-12 pb-8 px-5 rounded-b-[32px] shadow-xl">
        <Text className="text-white text-2xl font-bold tracking-wide">
          Daftar Jadwal
        </Text>
        <Text className="text-gray-200 mt-1 text-sm">
          {totalCount} total jadwal
        </Text>
      </View>

      <View className="px-5 -mt-4 mb-4">
        <View className="flex-row items-center bg-white rounded-2xl shadow-lg px-4 py-3">
          <Search size={20} color="#6b7280" strokeWidth={2.5} />
          <TextInput
            placeholder="Cari berdasarkan event, customer, location..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-[15px] text-gray-800"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9ca3af" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.traneventid}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 70 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ScheduleCard
              item={item}
              onPress={() => handlePressCard(item)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Calendar size={32} color="#9ca3af" strokeWidth={2} />
              </View>
              <Text className="text-gray-400 text-base font-semibold">
                Jadwal tidak ditemukan
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                Tarik ke bawah untuk memperbarui
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}