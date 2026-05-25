import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Api from '../utils/Api';
import Storage from '../utils/Storage';

export default function LoginScreen({ setToken, navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Alert', 'Username dan password wajib diisi');
      return;
    }
    setLoading(true);
    // const context = this.context;
    const formData = new FormData();
    formData.append('username', username);
    formData.append('pass', password);
    console.log(formData.username);
    // let self = this;
    await axios
      .post(Api.getBaseUrl() + '/login', formData, {
        // method: 'POST',
        headers: Api.headersform(),
      })
      .then(async function (response) {
        if (response.data.success) {
          console.log('Response API:', response.data);
          const token = response.data.data[0].userid;
          const profileData = response.data.data;

          setToken(token);
          await AsyncStorage.setItem('userToken', token);
          await Storage.setProfile(profileData);
          ToastAndroid.show(response.data.pesan, 3000);
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          await Storage.clearProfile();
          ToastAndroid.show(response.data.pesan, 3000);
        }
        // context.setAuthState({ signedIn: true });
      })
      .catch(function (response) {
        console.log(response);
      });
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-gradient-to-b from-blue-50 to-blue-200 justify-center px-8">
      {/* Background divider */}
      <View className="absolute top-0 left-0 right-0 h-1/2 bg-gray-800 rounded-b-[50px]" />

      <View className="bg-white/90 p-8 rounded-3xl shadow-2xl">
        {/* Logo */}
        <View className="items-center mb-0">
          <Image
            source={require('../assets/logo.webp')}
            className="w-40 h-40"
            resizeMode='contain'
          />
          <Text className="text-3xl font-bold text-gray-700 tracking-wide">
            Maxindo LED
          </Text>
          <Text className="text-gray-500 mt-1 text-center">
            Silakan login untuk melanjutkan
          </Text>
        </View>

        {/* Divider */}
        <View className="border-b border-gray-200 my-4" />

        {/* Input fields */}
        <View className="space-y-5 mt-4">
          <View>
            <Text className="text-gray-700 font-semibold mb-2">Username</Text>
            <TextInput
              className="h-12 px-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 focus:border-blue-500"
              placeholder="Masukkan username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-gray-700 font-semibold mb-2">Password</Text>
            <TextInput
              className="h-12 px-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 focus:border-blue-500"
              placeholder="Masukkan password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity
          className={`mt-8 h-12 rounded-xl justify-center items-center ${
            loading ? 'bg-gray-500' : 'bg-gray-900'
          } shadow-lg active:scale-95`}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white text-lg font-semibold tracking-wide">
            {loading ? 'Loading...' : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View className="mt-8 items-center">
          <Text className="text-gray-400 text-sm">© 2026 Dwansoft</Text>
        </View>
      </View>
    </View>
  );
}