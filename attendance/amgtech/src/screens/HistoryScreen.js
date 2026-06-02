import { View, Text, ActivityIndicator } from 'react-native';
import { TouchableOpacity, FlatList } from 'react-native';
import { Clock, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback } from 'react';
import Api from '../utils/Api';
import Storage from '../utils/Storage';

const groupByDate = data => {
  const map = {};

  data.forEach(item => {
    const dateObj = new Date(item.leavedate);
    const dateKey = item.leavedate;

    if (!map[dateKey]) {
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];

      map[dateKey] = {
        date: `${dateObj.getDate()}`,
        day: dayNames[dateObj.getDay()],
        month: `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`,
        entries: [],
      };
    }

    if (item.check_in) {
      const time = item.check_in.substring(11, 16);
      const isLate = !!item.late_duration;
      map[dateKey].entries.push({
        type: 'Masuk',
        time,
        highlight: isLate,
        raw: item,
      });
    }

    if (item.check_out) {
      const time = item.check_out.substring(11, 16);
      map[dateKey].entries.push({
        type: 'Keluar',
        time,
        highlight: false,
        raw: item,
      });
    }
  });

  return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date));
};

function AttendanceRow({ type, time, highlight, detail, raw }) {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('HistoryDetail', {
          leaveid: raw.leaveid,
          type,
        })
      }
      className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 mb-2 border border-gray-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Left accent bar */}
      <View
        className={`w-1 h-10 rounded-full mr-3.5 ${
          highlight
            ? 'bg-red-400'
            : type === 'Masuk'
            ? 'bg-gray-400'
            : 'bg-gray-300'
        }`}
      />

      <View className="flex-1">
        <Text className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
          {type}
        </Text>
        <Text
          className={`text-[22px] font-extrabold leading-tight ${
            highlight ? 'text-red-500' : 'text-gray-800'
          }`}
        >
          {time}
        </Text>
        {detail && (
          <Text className="text-[11px] text-orange-400 mt-0.5">{detail}</Text>
        )}
      </View>

      {/* {highlight && (
        <View className="bg-red-50 px-2.5 py-1 rounded-full mr-2">
          <Text className="text-[10px] font-bold text-red-400">TERLAMBAT</Text>
        </View>
      )} */}

      <View className="w-7 h-7 bg-gray-100 rounded-xl items-center justify-center">
        <ChevronRight size={14} color="#9ca3af" strokeWidth={2.5} />
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-gray-700 pt-14 pb-5 px-5 rounded-b-[32px] shadow-xl"
        style={{
          shadowColor: '#374151',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-0.5">
          Riwayat
        </Text>
        <Text className="text-white text-2xl font-extrabold">Aktivitas</Text>
      </View>

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
            <ActivityIndicator size="large" color="#374151" />
          </View>
          <Text className="text-gray-400 mt-4 text-sm font-medium">
            Memuat riwayat...
          </Text>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-gray-100 rounded-3xl items-center justify-center mb-4">
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
            onPress={fetchHistory}
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

      {/* Empty */}
      {!loading && !error && groupedData.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 bg-gray-100 rounded-3xl items-center justify-center mb-3">
            <Clock size={28} color="#9ca3af" />
          </View>
          <Text className="text-gray-500 font-semibold text-sm">
            Belum ada riwayat
          </Text>
          <Text className="text-gray-400 text-[12px] mt-1">
            Absensi kamu akan muncul di sini
          </Text>
        </View>
      )}

      {!loading && !error && groupedData.length > 0 && (
        <FlatList
          data={groupedData}
          keyExtractor={(_, gi) => String(gi)}
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item: group }) => (
            <View className="flex-row mb-5">
              <View
                className="bg-white rounded-2xl w-full p-4 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View className="flex-row">
                  {/* Date Card */}
                  <View className="w-[68px] items-center mr-4 pt-0.5">
                    <View className="w-[60px] items-center bg-gray-700 rounded-2xl py-2.5">
                      <Text className="text-[28px] font-extrabold text-white leading-tight">
                        {group.date}
                      </Text>
                      <Text className="text-[12px] font-bold text-white/80">
                        {group.day}
                      </Text>
                      <View className="w-8 h-px bg-white/20 my-1.5" />
                      <Text className="text-[9px] font-semibold text-white/60 text-center px-1">
                        {group.month}
                      </Text>
                    </View>
                  </View>

                  {/* Entries */}
                  <View className="flex-1">
                    {group.entries.map((entry, ei) => (
                      <AttendanceRow key={ei} {...entry} />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}
          ListHeaderComponent={
            /* Summary Banner dipindah ke sini agar ikut scroll */
            <View className="mb-4">
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
                  <Clock size={18} color="#374151" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mb-0.5">
                    Total Hari Tercatat
                  </Text>
                  <Text className="text-gray-800 text-[16px] font-extrabold">
                    {groupedData.length} Hari
                  </Text>
                </View>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}
