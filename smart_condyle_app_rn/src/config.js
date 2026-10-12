import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Current local Wi-Fi IP of laptop
const CURRENT_LAPTOP_IP = '172.25.85.191';

const getBaseUrl = () => {
  // 1. Web browser: use current webpage hostname
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:8000`;
    }
    return 'http://localhost:8000';
  }

  // 2. Mobile (Expo Go / Dev Client):
  const expoHost = 
    Constants.expoConfig?.hostUri || 
    Constants.manifest?.debuggerHost || 
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (expoHost) {
    const ip = expoHost.split(':')[0];
    if (ip) {
      // Over USB, 127.0.0.1 works via adb reverse. Over Wi-Fi, it uses the Wi-Fi IP.
      return `http://${ip}:8000`;
    }
  }

  // 3. Fallback
  return `http://${CURRENT_LAPTOP_IP}:8000`;
};

export const API_URL = getBaseUrl();
console.log('SmartCondyle API_URL set to:', API_URL);



