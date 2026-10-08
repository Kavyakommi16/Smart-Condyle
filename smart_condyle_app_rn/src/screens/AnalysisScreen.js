import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Animated, Image } from 'react-native';
import { predictImage } from '../services/predictionService';
import { saveHistoryRecord, subscribeDarkMode } from '../services/storageService';

export default function AnalysisScreen({ route, navigation }) {
  const { imageUris = [], patient } = route.params || {};
  const [progress, setProgress] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 0, // Reset immediately
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [laserAnim]);

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
      const allResults = [];
      
      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const result = await predictImage(uri);
        
        // Save history record for each scan
        await saveHistoryRecord({
          patientId: patient?.patientId || 'P-1001',
          name: patient?.name || 'Sample Patient',
          age: patient?.age || '30',
          gender: patient?.gender || 'Male',
          injury: patient?.injury || '',
          symptoms: patient?.symptoms || '',
          history: patient?.history || '',
          imageUri: uri,
          prediction: result.prediction,
          confidence: result.confidence,
          severity: result.severity,
          date: new Date().toLocaleString(),
        });
        
        allResults.push({
          ...result,
          imageUri: uri,
        });
      }

      if (isMounted) {
        setProgress(100);
        clearInterval(timer);

        const updatedPatient = {
          ...patient,
          results: allResults, // pass all results for ResultScreen
        };

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
  }, [imageUris, navigation, patient]);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.content}>
        <View style={[styles.scanBox, isDark && styles.darkScanBox]}>
          {imageUris.length > 0 ? (
            <Image source={{ uri: imageUris[0] }} style={styles.scanImage} resizeMode="cover" />
          ) : (
            <Text style={{fontSize: 50}}>🩻</Text>
          )}
          
          <Animated.View 
            style={[
              styles.laserLine, 
              { transform: [{ translateY: laserAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }] }
            ]} 
          />
          <View style={styles.scanOverlay} />
        </View>

        <Text style={[styles.title, isDark && styles.darkText]}>Analyzing Scan...</Text>
        <Text style={[styles.subtitle, isDark && styles.darkSubtext]}>AI is detecting fractures & severity</Text>

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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  darkContainer: { backgroundColor: '#0F172A' },
  content: { padding: 30, flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  scanBox: {
    width: 200,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  darkScanBox: { borderColor: '#38BDF8', shadowColor: '#38BDF8' },
  scanImage: { width: '100%', height: '100%', opacity: 0.7 },
  
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00FF00',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },

  title: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  darkText: { color: '#F8FAFC' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 8, marginBottom: 30, textAlign: 'center' },
  darkSubtext: { color: '#94A3B8' },
  
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
