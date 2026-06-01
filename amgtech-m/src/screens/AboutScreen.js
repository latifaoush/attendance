import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Globe,
  Facebook,
  Phone,
  MessageCircle,
  BadgeAlert,
  ShieldCheck,
  ChevronRight,
  MessageSquareMore,
  Mail,
  MapPin,
  Instagram,
  Twitter,
  Heart,
  Star,
  Users,
  Award,
  Zap,
} from 'lucide-react-native';

// function FeatureCard({ icon: Icon, title, description, color }) {
//   return (
//     <View className={`${color} rounded-2xl p-4 mb-3`}>
//       <View className="flex-row items-start">
//         <View className="w-10 h-10 bg-white rounded-xl items-center justify-center mr-3">
//           <Icon size={20} color="#4f46e5" strokeWidth={2.5} />
//         </View>
//         <View className="flex-1">
//           <Text className="text-gray-900 font-bold text-base mb-1">
//             {title}
//           </Text>
//           <Text className="text-gray-600 text-sm">{description}</Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// function StatItem({ icon: Icon, value, label }) {
//   return (
//     <View className="items-center flex-1">
//       <View className="w-12 h-12 bg-indigo-100 rounded-2xl items-center justify-center mb-2">
//         <Icon size={22} color="#4f46e5" strokeWidth={2.5} />
//       </View>
//       <Text className="text-gray-900 text-xl font-bold">{value}</Text>
//       <Text className="text-gray-500 text-xs mt-0.5">{label}</Text>
//     </View>
//   );
// }

export default function AboutScreen() {
  const openLink = url => Linking.openURL(url);

  const socialItems = [
    {
      icon: Globe,
      label: 'Website',
      value: 'maxindoled.com',
      url: 'https://maxindoled.com',
      bgColor: 'bg-red-50',
      iconColor: '#ef4444',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: '0813-8277-7396',
      url: 'tel:+62813-8277-7396',
      bgColor: 'bg-blue-50',
      iconColor: '#3b82f6',
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Chat with us',
      url: 'https://wa.me/6281382777396',
      bgColor: 'bg-emerald-50',
      iconColor: '#059669',
    },
    {
      icon: MapPin,
      label: 'Address',
      value: 'Jl. Gempol Raya No.3A, RT.005/RW.009, Kunciran Indah, Kec. Pinang, Kota Tangerang, Banten 15144',
      url: 'https://maps.app.goo.gl/6kY3wQXFUYe5NptG9',
      bgColor: 'bg-purple-50',
      iconColor: '#9333ea',
    },
  ];

  const socialMedia = [
    {
      icon: Facebook,
      label: 'Facebook',
      color: 'bg-blue-500',
      url: 'https://web.facebook.com/dwansoft',
    },
    {
      icon: Instagram,
      label: 'Instagram',
      color: 'bg-pink-500',
      url: 'https://www.instagram.com/dwansoft/',
    },
    {
      icon: Twitter,
      label: 'Twitter',
      color: 'bg-sky-500',
      url: '#',
    },
  ];


  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-indigo-600 pt-12 pb-8 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-2xl font-bold tracking-wide">
              About Us
            </Text>
            <Text className="text-indigo-200 mt-1 text-sm">
              Learn more about AMG Tech
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 -mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & App Info Card */}
        <View className="bg-white rounded-3xl shadow-lg p-6 mb-5 items-center">
          <View className="w-24 h-24 bg-indigo-100 rounded-3xl items-center justify-center mb-4">
            <Text className="text-indigo-600 text-4xl font-bold">AMG</Text>
          </View>
          <Text className="text-gray-900 text-2xl font-bold">
            AMG Technician
          </Text>
          <Text className="text-gray-500 text-sm mt-1">Version 1.0.0</Text>
          <View className="flex-row items-center mt-3 bg-green-50 px-3 py-1.5 rounded-full">
            <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            <Text className="text-green-700 text-xs font-semibold">
              All Systems Operational
            </Text>
          </View>
        </View>

        {/* Company Stats */}
        {/* <View className="bg-white rounded-2xl shadow-md p-5 mb-5">
          <Text className="text-gray-900 text-lg font-bold mb-4">
            Our Impact
          </Text>
          <View className="flex-row justify-between">
            <StatItem icon={Users} value="10K+" label="Active Users" />
            <StatItem icon={Award} value="5K+" label="Completed" />
            <StatItem icon={Star} value="4.8" label="Rating" />
          </View>
        </View> */}

        {/* Features */}
        {/* <View className="mb-5">
          <Text className="text-gray-900 text-lg font-bold mb-3 px-1">
            Why Choose Us
          </Text>
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </View> */}

        {/* Contact Information */}
        <View className="mb-5">
          <Text className="text-gray-900 text-lg font-bold mb-3 px-1">
            Contact Information
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {socialItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => openLink(item.url)}
                activeOpacity={0.7}
                className={`flex-row items-center p-4 ${
                  index !== socialItems.length - 1
                    ? 'border-b border-gray-100'
                    : ''
                }`}
              >
                <View
                  className={`w-11 h-11 ${item.bgColor} rounded-xl items-center justify-center mr-3`}
                >
                  <item.icon
                    size={20}
                    color={item.iconColor}
                    strokeWidth={2.5}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-0.5">
                    {item.label}
                  </Text>
                  <Text className="text-gray-900 text-sm font-semibold">
                    {item.value}
                  </Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" strokeWidth={2.5} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Social Media */}
        <View className="mb-5">
          <Text className="text-gray-900 text-lg font-bold mb-3 px-1">
            Follow Us
          </Text>
          <View className="flex-row justify-between">
            {socialMedia.map((social, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => openLink(social.url)}
                activeOpacity={0.8}
                className={`${social.color} flex-1 ${
                  index === 1 ? 'mx-2' : ''
                } rounded-2xl p-4 items-center shadow-md`}
              >
                <social.icon size={28} color="white" strokeWidth={2.5} />
                <Text className="text-white text-xs font-semibold mt-2">
                  {social.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About Menus */}
        {/* <View className="mb-5">
          <Text className="text-gray-900 text-lg font-bold mb-3 px-1">
            More
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {aboutMenus.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => openLink(item.url)}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between p-4 ${
                  index !== aboutMenus.length - 1
                    ? 'border-b border-gray-100'
                    : ''
                }`}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-3">
                    <item.icon size={20} color="#4f46e5" strokeWidth={2.5} />
                  </View>
                  <Text className="text-gray-900 text-base font-semibold">
                    {item.label}
                  </Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" strokeWidth={2.5} />
              </TouchableOpacity>
            ))}
          </View>
        </View> */}

        {/* Footer */}
        <Text className="text-center text-xs text-gray-400 mb-2">
          © 2026 Maxindo LED — All rights reserved
        </Text>
        <Text className="text-center text-xs text-gray-400 mb-8">
          Powered by React Native
        </Text>
      </ScrollView>
    </View>
  );
}
