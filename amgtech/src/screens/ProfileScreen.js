import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Mail, User, Phone, Lock, Key, X } from 'lucide-react-native';
import Storage from '../utils/Storage';
import Api from '../utils/Api';
import axios from 'axios';

function ProfileHeader({ user }) {
  return (
    <View className="items-center mb-8">
      <View
        className="w-24 h-24 bg-gray-100 rounded-3xl items-center justify-center mb-6 border border-gray-200"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <User size={44} color="#6b7280" strokeWidth={1.8} />
      </View>
      <Text className="text-gray-900 text-2xl font-black">
        {user?.employeenama || 'User'}
      </Text>
      <Text className="text-gray-500 text-sm mt-2 font-semibold">
        ID: {user?.employeekode || '-'}
      </Text>
    </View>
  );
}

function SectionTitle({ title }) {
  return (
    <View className="flex-row items-center mb-4 mt-7">
      <View className="w-5 h-5 rounded-md bg-gray-800 items-center justify-center mr-2">
        <View className="w-1.5 h-1.5 bg-white rounded-full" />
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

function InfoCard({ user }) {
  const infos = [
    { icon: Mail, label: 'Email', value: user?.email || '-' },
    { icon: Phone, label: 'Nomor Telepon', value: user?.phone || '-' },
  ];

  return (
    <View
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {infos.map((info, index) => (
        <View
          key={index}
          className={`flex-row items-center px-4 py-4 ${
            index !== infos.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-3">
            <info.icon size={18} color="#4f46e5" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text
              className="text-[10px] font-semibold text-gray-400 uppercase mb-1"
              style={{ letterSpacing: 0.8 }}
            >
              {info.label}
            </Text>
            <Text className="text-gray-800 text-[14px] font-bold font-mono">
              {info.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen({ setToken }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passold, setPassold] = useState('');
  const [pass, setPass] = useState('');
  const [passre, setPassre] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const profile = await Storage.getProfile();
      const data = Array.isArray(profile) ? profile[0] : profile;
      setUserData(data);
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'LogOut',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('profile');
            setToken(null);
          },
        },
      ],
    );
  };

  const validatePasswordForm = () => {
    if (!passold.trim()) {
      Alert.alert('Error', 'Password lama tidak boleh kosong');
      return false;
    }
    if (!pass.trim()) {
      Alert.alert('Error', 'Password baru tidak boleh kosong');
      return false;
    }
    if (!passre.trim()) {
      Alert.alert('Error', 'Konfirmasi password tidak boleh kosong');
      return false;
    }
    if (pass !== passre) {
      Alert.alert('Error', 'Password baru tidak sama');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setLoading(true);
      const profile = await Storage.getProfile();
      const data = Array.isArray(profile) ? profile[0] : profile;

      if (!data?.userid) {
        Alert.alert('Error', 'Data pengguna tidak valid');
        return;
      }

      const formData = new FormData();
      formData.append('LoginID', data.userid);
      formData.append('pass', pass);
      formData.append('passold', passold);

      const response = await axios.post(
        Api.getBaseUrl() + '/changepassword',
        formData,
        {
          headers: Api.headersform(),
        },
      );

      if (response.data.success) {
        await Storage.setProfile(response.data.data);
        Alert.alert('Berhasil', 'Password berhasil diubah');
        setShowPasswordModal(false);
        setPassold('');
        setPass('');
        setPassre('');
      } else {
        Alert.alert('Error', response.data.pesan || 'Gagal mengganti password');
      }
    } catch (error) {
      console.log('Error reset password:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat mengganti password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-gray-800 pt-14 pb-8 px-5 rounded-b-[32px]"
        style={{
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text
              className="text-white/50 text-[10px] font-bold uppercase"
              style={{ letterSpacing: 1.5 }}
            >
              Pengaturan Akun
            </Text>
            <Text className="text-white text-2xl font-black mt-1">
              Profil
            </Text>
          </View>
        </View>
      </View>

      {isLoadingProfile ? (
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
            Memuat profil…
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 52 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View
            className="bg-white rounded-3xl border border-gray-100 overflow-hidden mt-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="px-6 pt-8 pb-6">
              <ProfileHeader user={userData} />
            </View>
          </View>

          {/* Account Info Section */}
          <SectionTitle title="Informasi Akun" />
          <InfoCard user={userData} />

          {/* Action Buttons */}
          <SectionTitle title="Keamanan" />

          {/* Reset Password Button */}
          <TouchableOpacity
            onPress={() => setShowPasswordModal(true)}
            activeOpacity={0.85}
            className="flex-row items-center justify-center bg-amber-500 py-4 rounded-2xl mb-3 border border-amber-600"
            style={{
              shadowColor: '#b45309',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Key size={20} color="#fff" strokeWidth={2} />
            <Text className="text-white text-[15px] font-black ml-2.5">
              Ubah Password
            </Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            className="flex-row items-center justify-center bg-red-500 py-4 rounded-2xl border border-red-600"
            style={{
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <LogOut size={20} color="#fff" strokeWidth={2} />
            <Text className="text-white text-[15px] font-black ml-2.5">
              Keluar dari Akun
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Password Reset Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-gray-50 rounded-t-3xl px-6 pt-6 pb-8">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text
                  className="text-gray-400 text-[10px] font-bold uppercase mb-1"
                  style={{ letterSpacing: 1.5 }}
                >
                  Keamanan Akun
                </Text>
                <Text className="text-gray-900 text-xl font-black">
                  Ubah Password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="w-10 h-10 bg-white rounded-xl items-center justify-center border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <X size={20} color="#6b7280" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {/* Old Password */}
              <View className="mb-5">
                <Text
                  className="text-gray-700 text-[12px] font-bold uppercase mb-2.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Password Lama
                </Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-semibold"
                  placeholder="Masukkan password lama"
                  placeholderTextColor="#d1d5db"
                  secureTextEntry
                  value={passold}
                  onChangeText={setPassold}
                  editable={!loading}
                />
              </View>

              {/* New Password */}
              <View className="mb-5">
                <Text
                  className="text-gray-700 text-[12px] font-bold uppercase mb-2.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Password Baru
                </Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-semibold"
                  placeholder="Masukkan password baru"
                  placeholderTextColor="#d1d5db"
                  secureTextEntry
                  value={pass}
                  onChangeText={setPass}
                  editable={!loading}
                />
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text
                  className="text-gray-700 text-[12px] font-bold uppercase mb-2.5"
                  style={{ letterSpacing: 0.8 }}
                >
                  Konfirmasi Password
                </Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-semibold"
                  placeholder="Konfirmasi password baru"
                  placeholderTextColor="#d1d5db"
                  secureTextEntry
                  value={passre}
                  onChangeText={setPassre}
                  editable={!loading}
                />
              </View>
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
              className={`flex-row items-center justify-center py-4 rounded-2xl border ${
                loading
                  ? 'bg-indigo-300 border-indigo-400'
                  : 'bg-indigo-600 border-indigo-700'
              }`}
              style={{
                shadowColor: loading ? 'transparent' : '#4f46e5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text className="text-white text-[15px] font-black">
                    Memproses…
                  </Text>
                </>
              ) : (
                <>
                  <Lock size={20} color="#fff" strokeWidth={2} />
                  <Text className="text-white text-[15px] font-black ml-2.5">
                    Simpan Password Baru
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}