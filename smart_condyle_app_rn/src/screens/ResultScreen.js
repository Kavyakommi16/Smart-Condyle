import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import { subscribeDarkMode } from '../services/storageService';

export default function ResultScreen({ route, navigation }) {
  const { patient } = route.params || {};
  const results = patient?.results || [{
    prediction: patient?.prediction || 'Unknown',
    confidence: patient?.confidence || 0,
    severity: patient?.severity || 'Unknown',
    imageUri: patient?.imageUri,
  }];
  
  // Get highest severity
  const getOverallSeverity = () => {
    if (results.some(r => r.severity === 'Severe')) return 'Severe';
    if (results.some(r => r.severity === 'Moderate')) return 'Moderate';
    if (results.some(r => r.severity === 'Mild')) return 'Mild';
    return 'None';
  };
  
  const overallSeverity = getOverallSeverity();
  const hasFracture = results.some(r => r.prediction?.includes('Fracture'));
  const hasInvalid = results.every(r => r.prediction?.includes('Invalid'));
  
  const overallPrediction = hasInvalid ? 'Invalid Image (Not an X-Ray)' : (hasFracture ? 'Fracture Detected' : 'Normal');
  const avgConfidence = results.reduce((sum, r) => sum + (typeof r.confidence === 'number' ? r.confidence : parseFloat(r.confidence) || 0), 0) / results.length;

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  const getSeverityColor = (sev) => {
    if (!sev || sev === 'Unknown') return '#888888';
    switch (sev) {
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
        <Text style={[styles.statusTitle, isDark && styles.darkText]}>Analysis Completed</Text>
        <Text style={[styles.scanCountText, isDark && styles.darkSubtext]}>Analyzed {results.length} Scan{results.length > 1 ? 's' : ''}</Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsScrollContent}
          snapToInterval={300}
          decelerationRate="fast"
        >
          {results.map((res, index) => (
            <View key={index} style={[styles.modernResultCard, isDark && styles.darkModernResultCard]}>
              <View style={styles.imageBox}>
                {res.imageUri ? (
                  <Image source={{ uri: res.imageUri }} style={styles.image} resizeMode="cover" />
                ) : (
                  <Text style={styles.noImageText}>🩻 No Image</Text>
                )}
                <View style={styles.gradientOverlay} />
              </View>
              
              <View style={styles.resultDetails}>
                <Text style={[styles.predText, { color: res.prediction?.includes('Invalid') ? '#888888' : res.prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
                  {res.prediction}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: getSeverityColor(res.severity) }]}>
                    <Text style={styles.badgeText}>{res.severity}</Text>
                  </View>
                  <Text style={[styles.confText, isDark && styles.darkSubtext]}>
                    Conf: {typeof res.confidence === 'number' ? res.confidence.toFixed(1) : res.confidence}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

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
            <Text style={[styles.rowLabel, isDark && styles.darkSubtext]}>Overall Severity:</Text>
            <View style={[styles.badge, { backgroundColor: getSeverityColor(overallSeverity) }]}>
              <Text style={styles.badgeText}>{overallSeverity}</Text>
            </View>
          </View>
        </View>

        {!hasInvalid ? (
          <>
            <View style={[styles.card, isDark && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDark && styles.darkText]}>Medical Recommendations</Text>
              <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Visit an Oral & Maxillofacial Surgeon</Text>
              <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Soft diet for one week</Text>
              <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Avoid hard chewing</Text>
              <Text style={[styles.recItem, isDark && styles.darkSubtext]}>✓ Follow-up CT Scan if advised</Text>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Treatment', { 
                patient: { 
                  ...patient, 
                  prediction: overallPrediction, 
                  severity: overallSeverity,
                  confidence: avgConfidence.toFixed(2)
                } 
              })}
            >
              <Text style={styles.actionBtnText}>💉 View Treatment Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn, isDark && styles.darkSecondaryBtn]}
              onPress={() => navigation.navigate('Report', { 
                patient: { 
                  ...patient, 
                  prediction: overallPrediction, 
                  severity: overallSeverity,
                  confidence: avgConfidence.toFixed(2)
                } 
              })}
            >
              <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>📄 View Medical Report</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.actionBtnText}>Go Back</Text>
          </TouchableOpacity>
        )}
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
  resultsScroll: {
    marginBottom: 24,
  },
  resultsScrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  modernResultCard: {
    width: 280,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkModernResultCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  imageBox: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  resultDetails: {
    padding: 16,
  },
  predText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  noImageText: { color: '#888', fontSize: 16 },
  statusTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center', color: '#1A1A1A', marginTop: 10 },
  scanCountText: { fontSize: 14, textAlign: 'center', color: '#64748B', marginBottom: 20, fontWeight: '600' },
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
