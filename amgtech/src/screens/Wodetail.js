import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  MessageSquare,
  Clock,
  CalendarCheck,
  UserCog,
  HardHat,
  Navigation,
  FileText,
  Layers,
} from 'lucide-react-native';
import Storage from '../utils/Storage';
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

function InfoRow({ icon, label, value, isLast = false }) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? 'border-b border-gray-100' : ''
      }`}
    >
      <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
          style={{ letterSpacing: 0.8 }}
        >
          {label}
        </Text>
        <Text className="text-[14px] font-bold text-gray-800">
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );
}

function InfoCard({ children }) {
  return (
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
      {children}
    </View>
  );
}

export default function WorkOrderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const coordinateParts = detail?.coordinate?.split(/[\s,]+/) ?? [];
  const detailLatitude = coordinateParts[0] ?? null;
  const detailLongitude = coordinateParts[1] ?? null;
  const hasLocation = detailLatitude && detailLongitude;

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
          address: d.locations ?? '-',
          date: d.startdate ?? '-',
          enddate: d.enddate ?? '-',
          trandate: d.trandate ?? '-',
          type:
            d.eventtype === '0'
              ? 'Setup'
              : d.eventtype === '1'
              ? 'Event'
              : d.eventtype === '2'
              ? 'Bongkar'
              : d.eventtype === '3'
              ? 'Antar'
              : d.eventtype === '4'
              ? 'Tarik'
              : '-',
          tranduedate: d.tranduedate ?? '-',
          note: d.note ?? '',
          jobname: d.jobname ?? '-',
          coordinate: d.coordinate ?? null,
          position:
            d.positionid === 'pi' || d.positionid === 'le'
              ? 'PIC'
              : d.positionid === 'cr'
              ? 'Crew'
              : d.positionid === 'op'
              ? 'Operator'
              : d.positionid === 'sb'
              ? 'Standby'
              : d.positionid === 'fl'
              ? 'Freelance'
              : d.positionid === 'dr'
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
    );
  }

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
        {/* Back + Title */}
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
              Jadwal Kerja
            </Text>
            <Text className="text-white text-xl font-black mt-0.5">
              Detail Jadwal
            </Text>
          </View>
        </View>

        {/* No. Badge */}
        {detail?.no && (
          <View className="bg-white/10 rounded-2xl px-4 py-3 flex-row items-center border border-white/10">
            <View className="w-8 h-8 bg-white/15 rounded-xl items-center justify-center mr-3">
              <FileText size={16} color="rgba(255,255,255,0.9)" />
            </View>
            <View className="flex-1">
              <Text
                className="text-white/50 text-[10px] font-bold uppercase mb-0.5"
                style={{ letterSpacing: 1 }}
              >
                Nomor Jadwal
              </Text>
              <Text className="text-white text-[15px] font-extrabold">
                {detail.no}
              </Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 52 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Informasi Acara ── */}
        <SectionTitle title="Informasi Acara" />
        <InfoCard>
          <InfoRow
            icon={<Clock size={16} color="#4b5563" />}
            label="Tanggal Mulai"
            value={detail?.trandate}
          />
          <InfoRow
            icon={<CalendarCheck size={16} color="#4b5563" />}
            label="Tanggal Selesai"
            value={detail?.tranduedate}
          />
          <InfoRow
            icon={<MapPin size={16} color="#4b5563" />}
            label="Lokasi"
            value={detail?.address}
            isLast
          />
        </InfoCard>

        {/* Google Maps Button */}
        {hasLocation && (
          <TouchableOpacity
            activeOpacity={0.85}
            className="bg-gray-800 rounded-2xl px-3 py-3 mb-2 flex-row items-center justify-center border border-gray-700"
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps?q=${detailLatitude},${detailLongitude}`,
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

        {/* ── Detail Pekerjaan ── */}
        <SectionTitle title="Detail Pekerjaan" />
        <InfoCard>
          <InfoRow
            icon={<Layers size={16} color="#4b5563" />}
            label="Tahap"
            value={detail?.type}
          />
          <InfoRow
            icon={<Calendar size={16} color="#4b5563" />}
            label="Tanggal Mulai"
            value={detail?.date}
          />
          <InfoRow
            icon={<Calendar size={16} color="#4b5563" />}
            label="Tanggal Selesai"
            value={detail?.enddate}
          />
          <InfoRow
            icon={<UserCog size={16} color="#4b5563" />}
            label="Posisi"
            value={detail?.position}
          />
          <InfoRow
            icon={<HardHat size={16} color="#4b5563" />}
            label="Job"
            value={detail?.jobname}
            isLast
          />
        </InfoCard>

        {/* ── Catatan ── */}
        <SectionTitle title="Catatan" />
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
          {/* Header strip */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center mr-3">
              <MessageSquare size={16} color="#4b5563" />
            </View>
            <Text
              className="text-[10px] font-extrabold text-gray-500 uppercase"
              style={{ letterSpacing: 1 }}
            >
              Isi Catatan
            </Text>
          </View>

          <TextInput
            className="px-4 py-4 text-[14px] text-gray-700 min-h-[100px]"
            placeholderTextColor="#9ca3af"
            placeholder="Tidak ada catatan"
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