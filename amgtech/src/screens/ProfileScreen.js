import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Mail, User, Phone, Lock, Key, X } from 'lucide-react-native';
import Storage from '../utils/Storage';
import Api from '../utils/Api';
import axios from 'axios';

function ProfileHeader({ user }) {
  return (
    <View className="items-center mb-6">
      <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center shadow-xl mb-4 border-4 border-white">
        <User size={40} color="white" strokeWidth={2.5} />
      </View>
      <Text className="text-gray-900 text-2xl font-bold">
        {user?.employeenama || 'User'}
      </Text>
      <Text className="text-gray-500 text-sm mt-1">
        Code : {user?.employeekode || '-'}
      </Text>
      <View className="flex-row items-center mt-2 bg-green-50 px-3 py-1.5 rounded-full">
        <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        <Text className="text-green-700 text-xs font-semibold">
          {user?.status === '1' ? 'Active' : 'Not Active'}
        </Text>
      </View>
    </View>
  );
}

function InfoCard({ user }) {
  const infos = [
    { icon: Mail, label: 'Email', value: user?.email || ' -' },
    { icon: Phone, label: 'Phone', value: user?.phone || ' -' },
  ];

  return (
    <View className="bg-white rounded-2xl shadow-sm p-5 mb-5">
      <Text className="text-gray-900 text-lg font-bold mb-4">
        Personal Information
      </Text>
      {infos.map((info, index) => (
        <View
          key={index}
          className={`flex-row items-center py-3 ${
            index !== infos.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-3">
            <info.icon size={18} color="#4f46e5" strokeWidth={2.5} />
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-xs mb-0.5">{info.label}</Text>
            <Text className="text-gray-900 text-sm font-semibold">
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

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    const profile = await Storage.getProfile();
    // Pastikan mengambil objek pertama jika data berupa array
    const data = Array.isArray(profile) ? profile[0] : profile;
    setUserData(data);
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
            await AsyncStorage.removeItem('profile'); // Bersihkan profil saat logout
            setToken(null);
          },
        },
      ],
    );
  };

  const handleResetPassword = async () => {
    if (pass !== passre) {
      Alert.alert('Error', 'Password Tidak Sama');
      return;
    } else if (pass === '') {
      Alert.alert('Error', 'Password Tidak Boleh Kosong');
      return;
    }

    try {
      setLoading(true);
      const data = await Storage.getProfile();
      console.log('data:', data);
      const loginID = data[0].userid;
      console.log('loginID:', loginID);

      const formData = new FormData();
      formData.append('LoginID', loginID);
      formData.append('pass', pass);
      formData.append('passold', passold);
      console.log(formData);

      const response = await axios.post(
        Api.getBaseUrl() + '/changepassword',
        formData,
        {
          headers: Api.headersform(),
        },
      );

      console.log(response);

      if (response.data.success) {
        await Storage.setProfile(response.data.data);
        Alert.alert('Berhasil', 'Berhasil Ganti Password');
        setShowPasswordModal(false);
        setPassold('');
        setPass('');
        setPassre('');
      } else {
        Alert.alert('Error', response.data.pesan || 'Gagal mengganti password');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Terjadi kesalahan saat mengganti password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-gray-600 pt-12 pb-8 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-2xl font-bold tracking-wide">
              My Profile
            </Text>
            <Text className="text-indigo-200 mt-1 text-sm">
              Manage your account settings
            </Text>
          </View>
          {/* <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
            <Settings size={22} color="white" strokeWidth={2.5} />
          </TouchableOpacity> */}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 -mt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-2xl shadow-lg p-6 mb-5">
          <ProfileHeader user={userData} />
        </View>

        <InfoCard user={userData} />

        <TouchableOpacity
          onPress={() => setShowPasswordModal(true)}
          activeOpacity={0.8}
          className="flex-row items-center justify-center bg-amber-500 py-4 rounded-2xl shadow-lg mb-4"
        >
          <Key size={22} color="#fff" strokeWidth={2.5} />
          <Text className="text-white text-base font-bold ml-2">
            Reset Password
          </Text>
        </TouchableOpacity>

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="flex-row items-center justify-center bg-red-500 py-4 rounded-2xl shadow-lg mb-4"
        >
          <LogOut size={22} color="#fff" strokeWidth={2.5} />
          <Text className="text-white text-base font-bold ml-2">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Reset Password */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-gray-900 text-xl font-bold">
                Reset Password
              </Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              >
                <X size={20} color="#6b7280" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              {/* Password Lama */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2">
                  Password Lama
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="Masukkan password lama"
                  secureTextEntry
                  value={passold}
                  onChangeText={setPassold}
                />
              </View>

              {/* Password Baru */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2">
                  Password Baru
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="Masukkan password baru"
                  secureTextEntry
                  value={pass}
                  onChangeText={setPass}
                />
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text className="text-gray-700 text-sm font-semibold mb-2">
                  Konfirmasi Password
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="Konfirmasi password baru"
                  secureTextEntry
                  value={passre}
                  onChangeText={setPassre}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
                className={`flex-row items-center justify-center py-4 rounded-xl shadow-lg ${
                  loading ? 'bg-indigo-300' : 'bg-indigo-600'
                }`}
              >
                <Lock size={20} color="#fff" strokeWidth={2.5} />
                <Text className="text-white text-base font-bold ml-2">
                  {loading ? 'Loading...' : 'Ubah Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
