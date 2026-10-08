import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

export default function TreatmentScreen({ route, navigation }) {
  const { patient } = route.params || {};

  const getTreatmentSteps = () => {
    if (patient?.prediction === 'Normal') {
      return [
        '✓ No fracture detected',
        '✓ No surgery required',
        '✓ Routine dental follow-up'
      ];
    }
    if (patient?.severity === 'Mild') {
      return [
        '✓ Soft diet for 1–2 weeks',
        '✓ Analgesics & Anti-inflammatory medication',
        '✓ Jaw rest & ice pack application',
        '✓ Review after one week'
      ];
    }
    if (patient?.severity === 'Moderate') {
      return [
        '✓ Oral & Maxillofacial surgeon consultation',
        '✓ Soft diet & Maxillomandibular Fixation (MMF) if required',
        '✓ High resolution CT Scan',
        '✓ Review in 3–5 days'
      ];
    }
    return [
      '✓ Immediate hospital admission',
      '✓ Surgical treatment required',
      '✓ Open Reduction Internal Fixation (ORIF)',
      '✓ Continuous post-operative monitoring'
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Treatment Plan</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Details</Text>
          <Text style={styles.detail}>Name: {patient?.name}</Text>
          <Text style={styles.detail}>ID: {patient?.patientId}</Text>
          <Text style={styles.detail}>Age: {patient?.age} | Gender: {patient?.gender}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Diagnosis</Text>
          <Text style={[styles.diagnosisText, { color: patient?.prediction === 'Normal' ? '#34C759' : '#FF3B30' }]}>
            {patient?.prediction}
          </Text>
          <Text style={styles.detail}>Confidence: {patient?.confidence}%</Text>
          <Text style={styles.detail}>Severity: {patient?.severity}</Text>
        </View>

        {patient?.prediction !== 'Invalid Image (Not an X-Ray)' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recommended Protocol</Text>
            {getTreatmentSteps().map((step, i) => (
              <Text key={i} style={styles.stepText}>{step}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop()}>
          <Text style={styles.doneBtnText}>
            {patient?.prediction === 'Invalid Image (Not an X-Ray)' ? 'Go Back' : 'Treatment Plan Accepted'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 10 },
  detail: { fontSize: 15, color: '#444', marginBottom: 6 },
  diagnosisText: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  stepText: { fontSize: 15, color: '#333', marginBottom: 10, lineHeight: 22 },
  doneBtn: { backgroundColor: '#34C759', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  doneBtnText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});
