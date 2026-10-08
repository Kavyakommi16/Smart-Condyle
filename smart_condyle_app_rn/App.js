import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PatientRegistrationScreen from './src/screens/PatientRegistrationScreen';
import UploadScanScreen from './src/screens/UploadScanScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ResultScreen from './src/screens/ResultScreen';
import TreatmentScreen from './src/screens/TreatmentScreen';
import ReportScreen from './src/screens/ReportScreen';
import PatientHistoryScreen from './src/screens/PatientHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RecycleBinScreen from './src/screens/RecycleBinScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          cardStyle: { flex: 1, backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign Up' }} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} options={{ title: 'OTP Verification' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Smart Condyle Dashboard',
            headerLeft: () => null,
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="PatientRegistration" component={PatientRegistrationScreen} options={{ title: 'Patient Registration' }} />
        <Stack.Screen name="UploadScan" component={UploadScanScreen} options={{ title: 'Upload Jaw Scan' }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'AI Analysis' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Analysis Result' }} />
        <Stack.Screen name="Treatment" component={TreatmentScreen} options={{ title: 'Treatment Plan' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Medical Report' }} />
        <Stack.Screen name="PatientHistory" component={PatientHistoryScreen} options={{ title: 'Patient History' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="RecycleBin" component={RecycleBinScreen} options={{ title: 'Recycle Bin', headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
