import { View, Text, ActivityIndicator } from 'react-native';
import { TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Clock } from 'lucide-react-native';
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
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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
        detail: isLate ? `Terlambat ${item.late_duration}` : null,
        raw: item,
      });
    }

    if (item.check_out) {
      const time = item.check_out.substring(11, 16);
      const isOvertime = !!item.overtime_duration;
      map[dateKey].entries.push({
        type: 'Keluar',
        time,
        highlight: false,
        detail: isOvertime ? `Lembur ${item.overtime_duration}` : null,
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
      onPress={() => navigation.navigate('HistoryDetail', {
        leaveid: raw.leaveid,
        type,
      })}
      className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3.5 mb-2.5 shadow-sm border border-gray-50"
    >
      <View>
        <Text className="text-[13px] text-gray-500 mb-0.5">{type}</Text>
        <Text className={`text-[22px] font-bold ${highlight ? 'text-red-500' : 'text-gray-900'}`}>
          {time}
        </Text>
        {detail && (
          <Text className="text-[11px] text-orange-400 mt-0.5">{detail}</Text>
        )}
      </View>
      <Text className="text-gray-400 text-base ml-1">›</Text>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <Text className="text-[15px] font-bold text-gray-900">Aktivitas</Text>
        <View className="w-9 h-9" />
      </View>

      {/* Loading */}
      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-400 mt-3 text-sm">Memuat riwayat...</Text>
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-base text-center">{error}</Text>
          <TouchableOpacity
            className="mt-4 bg-indigo-600 px-6 py-2.5 rounded-xl"
            onPress={fetchHistory}
          >
            <Text className="text-white font-semibold">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {!loading && !error && groupedData.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <Clock size={40} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-sm">Belum ada riwayat absensi</Text>
        </View>
      )}

      {/* List */}
      {!loading && !error && groupedData.length > 0 && (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {groupedData.map((group, gi) => (
            <View key={gi} className="flex-row mb-6">
              {/* Date Card */}
              <View className="w-[72px] items-center mr-3 pt-1">
                <View className="w-[62px] items-center border border-gray-200 rounded-2xl py-2 bg-white">
                  <Text className="text-[26px] font-extrabold text-gray-900 leading-tight">
                    {group.date}
                  </Text>
                  <Text className="text-[12px] font-semibold text-gray-500">{group.day}</Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">{group.month}</Text>
                </View>
              </View>

              {/* Entries */}
              <View className="flex-1">
                {group.entries.map((entry, ei) => (
                  <AttendanceRow key={ei} {...entry} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}