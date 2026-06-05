import { View, Text, ActivityIndicator } from 'react-native';
import { TouchableOpacity, FlatList } from 'react-native';
import { Clock, ChevronRight, CalendarDays } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback } from 'react';
import Api from '../utils/Api';
import Storage from '../utils/Storage';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const groupByDate = data => {
  const map = {};

  data.forEach(item => {
    const dateObj = new Date(item.leavedate);
    const dateKey = item.leavedate;

    if (!map[dateKey]) {
      map[dateKey] = {
        dateObj,
        date: `${dateObj.getDate()}`,
        day: DAY_NAMES[dateObj.getDay()],
        month: `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`,
        entries: [],
      };
    }

    if (item.check_in) {
      map[dateKey].entries.push({
        type: 'Masuk',
        time: item.check_in.substring(11, 16),
        highlight: !!item.late_duration,
        highlightLabel: 'TERLAMBAT',
        raw: item,
      });
    }

    if (item.check_out) {
      map[dateKey].entries.push({
        type: 'Keluar',
        time: item.check_out.substring(11, 16),
        highlight: !!item.overtime_duration,
        highlightLabel: 'LEMBUR',
        raw: item,
      });
    }
  });

  return Object.values(map).sort((a, b) => b.dateObj - a.dateObj);
};

function AttendanceRow({ type, time, highlight, highlightLabel, raw }) {
  const navigation = useNavigation();

  const isIn = type === 'Masuk';
  const accentColor = highlight ? 'bg-red-400' : isIn ? 'bg-emerald-400' : 'bg-gray-300';
  const timeColor = highlight ? 'text-red-500' : 'text-gray-800';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() =>
        navigation.navigate('HistoryDetail', { leaveid: raw.leaveid, type })
      }
      className="flex-row items-center bg-gray-50 rounded-2xl px-3.5 py-3 mb-2 border border-gray-100"
    >
      {/* Left accent bar */}
      <View className={`w-1 h-10 rounded-full mr-3 ${accentColor}`} />

      <View className="flex-1">
        <Text
          className="text-[10px] font-extrabold text-gray-400 uppercase mb-0.5"
          style={{ letterSpacing: 1 }}
        >
          {type}
        </Text>
        <Text className={`text-[22px] font-black leading-tight ${timeColor}`}>
          {time}
        </Text>
      </View>

      {highlight && (
        <View
          className={`px-2 py-0.5 rounded-full mr-2.5 ${
            highlightLabel === 'TERLAMBAT' ? 'bg-red-50' : 'bg-orange-50'
          }`}
        >
          <Text
            className={`text-[9px] font-black uppercase ${
              highlightLabel === 'TERLAMBAT' ? 'text-red-400' : 'text-orange-400'
            }`}
            style={{ letterSpacing: 0.5 }}
          >
            {highlightLabel}
          </Text>
        </View>
      )}

      <View className="w-7 h-7 bg-white rounded-xl items-center justify-center border border-gray-100">
        <ChevronRight size={13} color="#9ca3af" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const p = await Storage.getProfile();
      const profile = Array.isArray(p) ? p[0] : p;

      if (!profile?.userid || String(profile.userid).trim() === '') {
        setError('Data profil atau User ID tidak ditemukan.');
        return;
      }

      const formData = new FormData();
      formData.append('userid', String(profile.userid).trim());

      const response = await Api.getLeaveList(formData);

      if (response?.success && response?.data?.length > 0) {
        setGroupedData(groupByDate(response.data));
      } else {
        setGroupedData([]);
      }
    } catch (err) {
      console.log('Error fetch history:', err);
      setError('Gagal memuat data. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
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
            Memuat riwayat…
          </Text>
        </View>
      </View>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-red-50 rounded-2xl items-center justify-center mb-4 border border-red-100">
            <Text className="text-3xl">⚠️</Text>
          </View>
          <Text className="text-gray-800 text-base font-black text-center mb-1.5">
            Oops, terjadi masalah
          </Text>
          <Text className="text-gray-400 text-[13px] text-center leading-relaxed mb-7">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-gray-800 px-10 py-3.5 rounded-2xl border border-gray-700"
            onPress={fetchHistory}
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
      </View>
    );
  }

  /* ── Empty ── */
  if (groupedData.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center px-8">
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
            Belum ada riwayat
          </Text>
          <Text className="text-gray-400 text-[13px] text-center">
            Absensi kamu akan muncul di sini
          </Text>
        </View>
      </View>
    );
  }

  /* ── Main List ── */
  return (
    <View className="flex-1 bg-gray-50">
      <Header totalDays={groupedData.length} />

      <FlatList
        data={groupedData}
        keyExtractor={(_, gi) => String(gi)}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View className="flex-row items-center mb-4">
            <View className="w-5 h-5 rounded-md bg-gray-800 items-center justify-center mr-2">
              <View className="w-1.5 h-1.5 bg-white rounded-full" />
            </View>
            <Text
              className="text-[11px] font-extrabold text-gray-500 uppercase"
              style={{ letterSpacing: 1.5 }}
            >
              Rekap Harian
            </Text>
            <View className="flex-1 h-px bg-gray-100 ml-3" />
          </View>
        }
        renderItem={({ item: group }) => (
          <View className="mb-4">
            <View
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {/* Date header strip */}
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
                <View className="bg-gray-800 rounded-xl px-3 py-1.5 mr-3 items-center min-w-[44px]">
                  <Text className="text-white text-[22px] font-black leading-tight">
                    {group.date}
                  </Text>
                  <Text
                    className="text-white/60 text-[9px] font-bold uppercase"
                    style={{ letterSpacing: 0.5 }}
                  >
                    {group.day}
                  </Text>
                </View>
                <View>
                  <Text
                    className="text-[10px] font-extrabold text-gray-400 uppercase"
                    style={{ letterSpacing: 1 }}
                  >
                    {group.month}
                  </Text>
                  <Text className="text-gray-800 text-[13px] font-bold mt-0.5">
                    {group.entries.length} aktivitas tercatat
                  </Text>
                </View>
              </View>

              {/* Entries */}
              <View className="px-3 pt-3 pb-1">
                {group.entries.map((entry, ei) => (
                  <AttendanceRow key={ei} {...entry} />
                ))}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function Header({ totalDays }) {
  return (
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
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text
            className="text-white/50 text-[10px] font-bold uppercase"
            style={{ letterSpacing: 1.5 }}
          >
            Rekap Kehadiran
          </Text>
          <Text className="text-white text-2xl font-black mt-0.5">
            Riwayat Aktivitas
          </Text>
        </View>

        {totalDays != null && (
          <View className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2 items-center">
            <Text className="text-white text-[18px] font-black leading-none">
              {totalDays}
            </Text>
            <Text
              className="text-white/50 text-[9px] font-bold uppercase mt-0.5"
              style={{ letterSpacing: 0.8 }}
            >
              Hari
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}