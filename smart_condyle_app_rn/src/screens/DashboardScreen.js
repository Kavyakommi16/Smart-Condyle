import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Platform, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLastPatient, subscribeDarkMode, getDoctorProfile } from '../services/storageService';
import { getSession } from '../services/authService';

export default function DashboardScreen({ navigation, route }) {
  const [isDark, setIsDark] = useState(false);
  const user = route?.params?.user;
  const [username, setUsername] = useState(user?.name || user?.email?.split('@')[0] || 'Doctor');
  const [avatarUri, setAvatarUri] = useState(null);

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const session = await getSession();
        if (session) {
          const profile = await getDoctorProfile(session.uid);
          if (profile && profile.name) {
            setUsername(profile.name);
          } else if (session.name) {
            setUsername(session.name);
          }
          if (profile && profile.avatarUri) {
            setAvatarUri(profile.avatarUri);
          } else {
            setAvatarUri(null);
          }
        }
      };
      loadProfile();
    }, [])
  );

  const defaultPatient = {
    patientId: 'P-DEMO',
    name: 'Sample Patient',
    age: '30',
    gender: 'Male',
    phone: '+91 9876543210',
    injury: 'Jaw pain after accidental trauma',
    symptoms: 'Pain, mild swelling near temporomandibular joint',
    history: 'No prior facial surgeries',
    prediction: 'Normal',
    confidence: 95.5,
    severity: 'None',
    imageUri: '',
  };

  const handleUploadClick = async () => {
    const patient = await getLastPatient();
    navigation.navigate('UploadScan', { patient: patient || defaultPatient });
  };

  const handleReportClick = () => {
    navigation.navigate('Report');
  };

  const cards = [
    {
      title: "New Patient",
      subtext: "Register details",
      icon: "🩺",
      color: "rgba(52, 199, 89, 0.12)",
      onPress: () => navigation.navigate('PatientRegistration')
    },
    {
      title: "Records",
      subtext: "Patient history",
      icon: "📋",
      color: "rgba(255, 149, 0, 0.12)",
      onPress: () => navigation.navigate('PatientHistory')
    },
    {
      title: "AI Analysis",
      subtext: "Upload & predict",
      icon: "🧠",
      color: "rgba(0, 122, 255, 0.12)",
      onPress: handleUploadClick
    },
    {
      title: "Reports",
      subtext: "View & print PDF",
      icon: "📄",
      color: "rgba(175, 82, 222, 0.12)",
      onPress: handleReportClick
    },
    {
      title: "Profile",
      subtext: "Manage account",
      icon: "👨‍⚕️",
      color: "rgba(255, 45, 85, 0.12)",
      onPress: () => navigation.navigate('Profile')
    },
    {
      title: "Settings",
      subtext: "App preferences",
      icon: "⚙️",
      color: "rgba(142, 142, 147, 0.12)",
      onPress: () => navigation.navigate('Settings')
    }
  ];

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>👨‍⚕️</Text>
            )}
          </View>
          <Text style={[styles.welcomeText, isDark && styles.darkText]}>Welcome {username}</Text>
          <Text style={[styles.subtext, isDark && styles.darkSubtext]}>AI Based Condyle Fracture Detection</Text>
        </View>

        <View style={styles.gridContainer}>
          {cards.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.gridCard, isDark && styles.darkGridCard]} 
              onPress={item.onPress} 
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : item.color }]}>
                <Text style={styles.largeIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.gridTitle, isDark && styles.darkText]}>{item.title}</Text>
              <Text style={styles.gridSubtext}>{item.subtext}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  darkContainer: { backgroundColor: '#0F172A' },
  scrollStyle: { flex: 1, width: '100%' },
  content: { padding: 20, flexGrow: 1, paddingBottom: 40 },
  header: { alignItems: 'center', marginVertical: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 40 },
  welcomeText: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subtext: { fontSize: 15, color: '#666', marginTop: 4 },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 10,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  gridCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  darkGridCard: { 
    backgroundColor: '#1E293B', 
    borderColor: '#334155' 
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  largeIcon: {
    fontSize: 32,
  },
  gridTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  gridSubtext: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
