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
      title: "Patient Registration",
      icon: "👤➕",
      onPress: () => navigation.navigate('PatientRegistration')
    },
    {
      title: "Patient History",
      icon: "📋",
      onPress: () => navigation.navigate('PatientHistory')
    },
    {
      title: "Upload X-ray / CT Scan",
      icon: "📤",
      onPress: handleUploadClick
    },
    {
      title: "Medical Report",
      icon: "📄",
      onPress: handleReportClick
    },
    {
      title: "Profile",
      icon: "👤",
      onPress: () => navigation.navigate('Profile')
    },
    {
      title: "Settings",
      icon: "⚙️",
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

        <View style={styles.cardContainer}>
          {cards.map((item, index) => (
            <TouchableOpacity key={index} style={[styles.card, isDark && styles.darkCard]} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.cardIconCircle, isDark && styles.darkIconCircle]}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.cardTitle, isDark && styles.darkText]}>{item.title}</Text>
              <Text style={styles.arrow}>➔</Text>
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
  cardContainer: { marginTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  darkCard: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  darkIconCircle: { backgroundColor: '#334155' },
  cardIcon: { fontSize: 24 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  arrow: { fontSize: 18, color: '#007AFF' },
});
