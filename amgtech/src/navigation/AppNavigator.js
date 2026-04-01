import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import Icon from 'react-native-vector-icons/FontAwesome5';
import { getToken } from '../utils/auth';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import WorkOrderScreen from '../screens/WorkOrderScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FaceDetectionScreen from '../screens/FaceDetectionScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ setToken }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: 'black',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { height: 60, paddingBottom: 5, backgroundColor: '#fff' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home')
            iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Schedule')
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          else if (route.name === 'Profile')
            iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Register Face')
            iconName = focused ? 'scan' : 'scan-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={WorkOrderScreen} />
      <Tab.Screen name="Register Face" component={FaceDetectionScreen} />
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} setToken={setToken} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// App Navigator
export default function AppNavigator() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken()
      .then(setToken)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return null; // bisa diganti splash screen / loader
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {token ? (
          <>
            <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
              {props => <MainTabs {...props} setToken={setToken} />}
            </Stack.Screen>

            <Stack.Screen
              name="WorkOrderDetail"
              component={WorkOrderDetailScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="DetectionFace"
              component={FaceDetectionScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {props => <LoginScreen {...props} setToken={setToken} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
