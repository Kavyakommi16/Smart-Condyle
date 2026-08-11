import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { predictImage } from '../services/predictionService';
import { saveHistoryRecord } from '../services/storageService';

export default function AnalysisScreen({ route, navigation }) {
  const { imageUri, patient } = route.params || {};
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    // Progress timer
    const timer = setInterval(() => {
      if (isMounted) {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 95;
          }
          return prev + 10;
        });
      }
    }, 150);

    const runAnalysis = async () => {
      const result = await predictImage(imageUri);

      if (isMounted) {
        setProgress(100);
        clearInterval(timer);

        const updatedPatient = {
          ...patient,
          prediction: result.prediction,
          confidence: result.confidence,
          severity: result.severity,
          imageUri: imageUri,
        };

        // Save history record with complete patient data
        await saveHistoryRecord({
          patientId: patient?.patientId || 'P-1001',
          name: patient?.name || 'Sample Patient',
          age: patient?.age || '30',
          gender: patient?.gender || 'Male',
          injury: patient?.injury || '',
          symptoms: patient?.symptoms || '',
          history: patient?.history || '',
          imageUri,
          prediction: result.prediction,
          confidence: result.confidence,
          severity: result.severity,
          date: new Date().toLocaleString(),
        });

        setTimeout(() => {
          if (isMounted) {
            navigation.replace('Result', { patient: updatedPatient });
          }
        }, 500);
      }
    };

    runAnalysis();

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [imageUri, navigation, patient]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.brainIcon}>🧠</Text>
        </View>

        <Text style={styles.title}>Analyzing X-ray...</Text>
        <Text style={styles.subtitle}>AI model is detecting condyle fracture</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.percentText}>{progress}%</Text>

        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 24 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 30, flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  brainIcon: { fontSize: 50 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 8, marginBottom: 30, textAlign: 'center' },
  progressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#E6E6E6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  percentText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 12,
  },
});
