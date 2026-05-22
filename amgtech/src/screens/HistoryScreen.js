import { View, Text } from 'react-native';
import { TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const DUMMY_DATA = [
  {
    date: '21',
    day: 'Kam',
    month: 'Mei 2026',
    entries: [
      { type: 'Masuk', time: '11:45', hasCalendar: true, highlight: true },
    ],
  },
  {
    date: '22',
    day: 'Jum',
    month: 'Mei 2026',
    entries: [
      { type: 'Keluar', time: '11:33', hasCalendar: false, highlight: false },
      { type: 'Masuk', time: '11:33', hasCalendar: false, highlight: false },
      { type: 'Keluar', time: '11:34', hasCalendar: false, highlight: false },
    ],
  },
];

function IconBadge({ children }) {
  return (
    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
      {children}
    </View>
  );
}

function AttendanceRow({ type, time, hasCalendar, highlight }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3.5 mb-2.5 shadow-sm border border-gray-50"
    >
      <View>
        <Text className="text-[13px] text-gray-500 mb-0.5">{type}</Text>
        <Text
          className={`text-[22px] font-bold ${
            highlight ? 'text-red-500' : 'text-gray-900'
          }`}
        >
          {time}
        </Text>
      </View>

      <View className="flex-row items-center gap-x-2">
        <IconBadge>
          <MapPin size={14} color="#ef4444" />
        </IconBadge>
        {hasCalendar && (
          <IconBadge>
            <Calendar size={14} color="#22c55e" />
          </IconBadge>
        )}
        <IconBadge>
          <Clock size={14} color="#6b7280" />
        </IconBadge>
        <Text className="text-gray-400 text-base ml-1">›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation();

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

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {DUMMY_DATA.map((group, gi) => (
          <View key={gi} className="flex-row mb-6">
            {/* Date badge */}
            <View className="w-[72px] items-center mr-3 pt-1">
              <View className="w-[62px] items-center border border-gray-200 rounded-2xl py-2 bg-white">
                <Text className="text-[26px] font-extrabold text-gray-900 leading-tight">
                  {group.date}
                </Text>
                <Text className="text-[12px] font-semibold text-gray-500">
                  {group.day}
                </Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">
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
        ))}
      </ScrollView>
    </View>
  );
}
