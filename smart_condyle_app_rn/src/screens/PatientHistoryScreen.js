import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { getHistory, deleteHistoryRecord, clearAllHistory, subscribeDarkMode } from '../services/storageService';

export default function PatientHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const unsubDark = subscribeDarkMode(setIsDark);
    return () => unsubDark();
  }, []);

  const loadData = async () => {
    const records = await getHistory();
    setHistory(records);
  };

  useEffect(() => {
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      loadData();
    }) : null;
    loadData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

  const handleDelete = async (id) => {
    await deleteHistoryRecord(id);
    loadData();
  };

  const handleClearAll = () => {
    Alert.alert("Clear History", "Are you sure you want to delete all saved history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => { await clearAllHistory(); loadData(); } }
    ]);
  };

  const handleOpenRecord = (item) => {
    const patientData = {
      patientId: item.patientId || item.id || 'P-1001',
      name: item.name || 'Sample Patient',
      age: item.age || '30',
      gender: item.gender || 'Male',
      injury: item.injury || '',
      symptoms: item.symptoms || '',
      history: item.history || '',
      prediction: item.prediction,
      confidence: item.confidence,
      severity: item.severity,
      imageUri: item.imageUri,
      date: item.date,
    };
    navigation.navigate('Result', { patient: patientData });
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.darkText]}>Patient History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyView}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={[styles.emptyTitle, isDark && styles.darkText]}>No Patient History</Text>
          <Text style={[styles.emptySub, isDark && styles.darkSubtext]}>Analyze an X-ray to build patient records.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={({ item }) => {
            const patientName = item.name || 'Sample Patient';
            const patientId = item.patientId || item.id || 'P-1001';

            return (
              <TouchableOpacity
                style={[styles.card, isDark && styles.darkCard]}
                onPress={() => handleOpenRecord(item)}
                activeOpacity={0.7}
              >
                <View style={styles.imageBox}>
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.img} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>📷</Text>
                  )}
                </View>

                <View style={styles.info}>
                  <Text style={[styles.patientName, isDark && styles.darkText]} numberOfLines={1}>
                    👤 {patientName}
                  </Text>

                  <Text style={styles.patientIdText}>
                    ID: <Text style={styles.idHighlight}>{patientId}</Text>
                  </Text>

                  <Text style={[styles.prediction, { color: item.prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
                    {item.prediction}
                  </Text>

                  <Text style={[styles.meta, isDark && styles.darkSubtext]}>
                    Conf: {item.confidence}% | Severity: {item.severity}
                  </Text>

                  <Text style={[styles.date, isDark && styles.darkSubtext]}>{item.date}</Text>
                </View>

                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                  <Text style={styles.deleteBtn}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  clearText: { color: '#FF3B30', fontWeight: 'bold' },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 14, borderRadius: 16, marginBottom: 14, alignItems: 'center', elevation: 2 },
  darkCard: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  imageBox: { width: 75, height: 75, borderRadius: 12, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 14 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 },
  patientIdText: { fontSize: 13, color: '#007AFF', fontWeight: '600', marginBottom: 4 },
  idHighlight: { color: '#007AFF', fontWeight: 'bold' },
  prediction: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  meta: { fontSize: 12, color: '#666' },
  date: { fontSize: 11, color: '#999', marginTop: 3 },
  deleteBtn: { fontSize: 20, padding: 8 },
});
