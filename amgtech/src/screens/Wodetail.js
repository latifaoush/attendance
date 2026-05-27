import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  MessageSquare,
  Building2,
  Wrench,
  Clock,
  CalendarCheck,
  UserCog,
  HardHat,
} from 'lucide-react-native';
import Storage from '../utils/Storage';
import Api from '../utils/Api';

export default function WorkOrderDetailScreen({ route, navigation }) {
  const { id } = route.params;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkOrderDetail = useCallback(async woId => {
    try {
      setLoading(true);
      const profile = await Storage.getProfile();
      const userId = profile?.[0]?.userid;
      if (!userId) return;

      const response = await Api.getScheduleDetail(userId, woId);

      if (response?.success && response.data?.[0]) {
        const d = response.data[0];
        setDetail({
          no: d.tranno ?? '-',
          customer: d.customer ?? '-',
          address: d.locations ?? '-',
          date: d.startdate ?? '-',
          enddate: d.enddate ?? '-',
          trandate: d.trandate ?? '-',
          type: d.eventtype === '0' ? 'Setup' : 'Bongkar',
          tranduedate: d.tranduedate ?? '-',
          workordertype: d.eventtype === '0' ? 'Setup' : 'Bongkar',
          note: d.note ?? '',
          jobname: d.jobname ?? '-',
          position:
            d.positionid == 'pi' || d.positionid == 'le'
              ? 'PIC'
              : d.positionid == 'cr'
              ? 'Crew'
              : d.positionid == 'op'
              ? 'Operator'
              : d.positionid == 'sb'
              ? 'Standby'
              : d.positionid == 'fl'
              ? 'Freelance'
              : d.positionid == 'dr'
              ? 'Driver'
              : '-',
        });
      } else {
        setDetail({});
      }
    } catch (error) {
      console.warn(
        '[Detail] fetchWorkOrderDetail error:',
        error?.message ?? error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrderDetail(id);
  }, [id, fetchWorkOrderDetail]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gray-600 pt-12 pb-6 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-3"
          >
            <ChevronLeft size={24} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Jadwal</Text>
            <Text className="text-indigo-200 text-sm mt-0.5">
              No: {detail?.no}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 -mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Info */}
        <View className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <Text className="text-gray-900 text-lg font-bold mb-4">
            Event Information
          </Text>

          <View className="space-y-3">
            <InfoRow
              icon={<Building2 size={20} color="#4f46e5" strokeWidth={2.5} />}
              bgColor="bg-indigo-100"
              label="Customer"
              value={detail?.customer}
            />
            <InfoRow
              icon={<MapPin size={20} color="#10b981" strokeWidth={2.5} />}
              bgColor="bg-green-100"
              label="Lokasi"
              value={detail?.address}
            />

            <InfoRow
              icon={<Clock size={20} color="#3b82f6" strokeWidth={2.5} />}
              bgColor="bg-blue-100"
              label="Tanggal Mulai"
              value={detail?.trandate}
            />
            <InfoRow
              icon={<CalendarCheck size={20} color="#10b981" strokeWidth={2.5} />}
              bgColor="bg-green-100"
              label="Tanggal Selesai"
              value={detail?.tranduedate}
            />
          </View>
        </View>
        <View className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <Text className="text-gray-900 text-lg font-bold mb-4">
            Detail Pekerjaan
          </Text>
          <View className="space-y-3">
            <InfoRow
              icon={<Wrench size={20} color="#4f46e5" strokeWidth={2.5} />}
              bgColor="bg-indigo-100"
              label="Tahapan"
              value={detail?.type}
            />
            <InfoRow
              icon={<Calendar size={20} color="#10b981" strokeWidth={2.5} />}
              bgColor="bg-green-100"
              label="Tanggal Mulai"
              value={detail?.date}
            />
            <InfoRow
              icon={<Calendar size={20} color="#3b82f6" strokeWidth={2.5} />}
              bgColor="bg-blue-100"
              label="Tanggal Selesai"
              value={detail?.enddate}
            />
            <InfoRow
              icon={<UserCog size={20} color="#4f46e5" strokeWidth={2.5} />}
              bgColor="bg-indigo-100"
              label="Posisi"
              value={detail?.position}
            />
            <InfoRow
              icon={<HardHat size={20} color="#10b981" strokeWidth={2.5} />}
              bgColor="bg-green-100"
              label="Job"
              value={detail?.jobname}
            />
          </View>
        </View>

        {/* Notes */}
        <View className="bg-white rounded-2xl shadow-md p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <MessageSquare size={20} color="#4f46e5" strokeWidth={2.5} />
            <Text className="text-gray-900 text-lg font-bold ml-2">
              Catatan
            </Text>
          </View>
          <TextInput
            className="border border-gray-300 rounded-xl p-4 text-gray-700 mb-4 min-h-[100px]"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            value={detail?.note}
            editable={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, bgColor, label, value }) {
  return (
    <View className="flex-row items-center">
      <View
        className={`w-10 h-10 ${bgColor} rounded-xl items-center justify-center mr-3 mt-1`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-gray-500 text-xs mb-0.5">{label}</Text>
        <Text className="text-gray-900 font-semibold">{value ?? '-'}</Text>
      </View>
    </View>
  );
}
