import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { getDoctorProfile, subscribeDarkMode } from '../services/storageService';
import { clearSession, getSession } from '../services/authService';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({
    name: 'Dr. Medical Specialist',
    role: 'Oral & Maxillofacial Surgeon',
    email: 'doctor@smartcondyle.ai',
    hospital: 'General Medical Center',
    department: 'Maxillofacial Surgery',
    phone: '+91 9876543210',
    avatarUri: '',
  });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  const loadProfile = async () => {
    const activeSessionUser = await getSession();
    const uid = activeSessionUser?.uid;
    const doctorProfile = await getDoctorProfile(uid);

    const merged = {
      name: doctorProfile.name || activeSessionUser?.name || 'Dr. Medical Specialist',
      role: doctorProfile.role || 'Oral & Maxillofacial Surgeon',
      email: doctorProfile.email || activeSessionUser?.email || 'doctor@smartcondyle.ai',
      hospital: doctorProfile.hospital || activeSessionUser?.hospital || 'General Medical Center',
      department: doctorProfile.department || activeSessionUser?.department || 'Maxillofacial Surgery',
      phone: doctorProfile.phone || activeSessionUser?.fullMobile || activeSessionUser?.mobile || '+91 9876543210',
      avatarUri: doctorProfile.avatarUri || activeSessionUser?.avatarUri || '',
    };

    setProfile(merged);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    loadProfile();
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarCircle}>
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarIcon}>👨‍⚕️</Text>
          )}
        </View>

        <Text style={[styles.name, isDark && styles.darkText]}>{profile.name}</Text>
        <Text style={[styles.role, isDark && styles.darkSubtext]}>{profile.role}</Text>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={[styles.editBtn, isDark && styles.darkEditBtn]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editBtnText}>✏️ Edit Profile & Change Photo</Text>
        </TouchableOpacity>

        {/* Profile Details Card */}
        <View style={[styles.card, isDark && styles.darkCard]}>
          <Text style={styles.cardHeader}>Doctor Information</Text>

          <View style={[styles.infoRow, isDark && styles.darkRow]}>
            <Text style={[styles.infoLabel, isDark && styles.darkSubtext]}>Email:</Text>
            <Text style={[styles.infoVal, isDark && styles.darkText]}>{profile.email || 'N/A'}</Text>
          </View>

          <View style={[styles.infoRow, isDark && styles.darkRow]}>
            <Text style={[styles.infoLabel, isDark && styles.darkSubtext]}>Phone:</Text>
            <Text style={[styles.infoVal, isDark && styles.darkText]}>{profile.phone || 'N/A'}</Text>
          </View>

          <View style={[styles.infoRow, isDark && styles.darkRow]}>
            <Text style={[styles.infoLabel, isDark && styles.darkSubtext]}>Hospital:</Text>
            <Text style={[styles.infoVal, isDark && styles.darkText]}>{profile.hospital || 'N/A'}</Text>
          </View>

          <View style={[styles.infoRow, isDark && styles.darkRow]}>
            <Text style={[styles.infoLabel, isDark && styles.darkSubtext]}>Department:</Text>
            <Text style={[styles.infoVal, isDark && styles.darkText]}>{profile.department || 'N/A'}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  darkContainer: { backgroundColor: '#0F172A' },
  scrollStyle: { flex: 1, width: '100%' },
  content: { padding: 24, alignItems: 'center', flexGrow: 1, paddingBottom: 60 },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarIcon: { fontSize: 55 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' },
  role: { fontSize: 15, color: '#666', marginTop: 4, marginBottom: 16, textAlign: 'center' },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  editBtn: {
    backgroundColor: '#E6F0FA',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 24,
  },
  darkEditBtn: { backgroundColor: '#1E293B' },
  editBtnText: { color: '#007AFF', fontSize: 15, fontWeight: 'bold' },
  card: {
    backgroundColor: '#F5F7FA',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 30,
    elevation: 2,
  },
  darkCard: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  cardHeader: { fontSize: 17, fontWeight: 'bold', color: '#007AFF', marginBottom: 12 },
  infoRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  darkRow: { borderBottomColor: '#334155' },
  infoLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  infoVal: { fontSize: 15, color: '#1A1A1A', fontWeight: '500', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
