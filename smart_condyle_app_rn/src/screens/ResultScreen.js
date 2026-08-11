import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import { subscribeDarkMode } from '../services/storageService';

export default function ResultScreen({ route, navigation }) {
  const { patient } = route.params || {};
  const severity = patient?.severity || 'Unknown';
  const prediction = patient?.prediction || 'Unknown';
  const confidence = patient?.confidence || 0;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  const getSeverityColor = () => {
    switch (severity) {
      case 'Severe': return '#FF3B30';
      case 'Moderate': return '#FF9500';
      case 'Mild': return '#FFCC00';
      default: return '#34C759';
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {/* Square Image Box (1:1 Aspect Ratio) */}
        <View style={styles.imageBox}>
          {patient?.imageUri ? (
            <Image source={{ uri: patient.imageUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.noImageText}>🩻 No Image Available</Text>
          )}
        </View>

        <Text style={[styles.statusTitle, isDark && styles.darkText]}>Analysis Completed</Text>

        <View style={[styles.card, isDark && styles.darkCard]}>
          <View style={[styles.row, isDark && styles.darkRow]}>
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Patient Name:</Text>
            <Text style={[styles.rowVal, isDark && styles.darkText]}>{patient?.name || 'Sample Patient'}</Text>
          </View>

          <View style={[styles.row, isDark && styles.darkRow]}>
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Patient ID:</Text>
            <Text style={[styles.rowVal, { color: '#007AFF', fontWeight: 'bold' }]}>{patient?.patientId || 'P-1001'}</Text>
          </View>

          <View style={[styles.row, isDark && styles.darkRow]}>
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Age / Gender:</Text>
            <Text style={[styles.rowVal, isDark && styles.darkText]}>{patient?.age || '30'} yrs ({patient?.gender || 'Male'})</Text>
          </View>

          <View style={[styles.row, isDark && styles.darkRow]}>
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Prediction:</Text>
            <Text style={[styles.rowVal, { fontWeight: 'bold', color: prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
              {prediction}
            </Text>
          </View>

          <View style={[styles.row, isDark && styles.darkRow]}>
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Confidence:</Text>
            <Text style={[styles.rowVal, isDark && styles.darkText]}>{typeof confidence === 'number' ? confidence.toFixed(2) : confidence}%</Text>
          </View>

          <View style={[styles.row, isDark && styles.darkRow]}>
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Severity:</Text>
            <View style={[styles.badge, { backgroundColor: getSeverityColor() }]}>
              <Text style={styles.badgeText}>{severity}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, isDark && styles.darkCard]}>
          <Text style={[styles.cardTitle, isDark && styles.darkText]}>Medical Recommendations</Text>
          <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Visit an Oral & Maxillofacial Surgeon</Text>
          <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Soft diet for one week</Text>
          <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Avoid hard chewing</Text>
          <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Follow-up CT Scan if advised</Text>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Treatment', { patient })}
        >
          <Text style={styles.actionBtnText}>💉 View Treatment Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn, isDark && styles.darkSecondaryBtn]}
          onPress={() => navigation.navigate('Report', { patient })}
        >
          <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>📄 View Medical Report</Text>
        </TouchableOpacity>
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
  content: { padding: 20, flexGrow: 1, paddingBottom: 60 },
  imageBox: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  image: { width: '100%', height: '100%' },
  noImageText: { color: '#888', fontSize: 16 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1A1A1A', marginBottom: 20 },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  darkCard: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  darkRow: { borderBottomColor: '#334155' },
  rowLabel: { fontSize: 15, color: '#666' },
  rowVal: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  recItem: { fontSize: 15, color: '#444', marginBottom: 6 },
  actionBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#E6F0FA' },
  darkSecondaryBtn: { backgroundColor: '#334155' },
  secondaryBtnText: { color: '#007AFF' },
});
