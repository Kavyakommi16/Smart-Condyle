import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Platform } from 'react-native';
import { getDeletedHistory, restoreHistoryRecord, permanentDeleteHistoryRecord, subscribeDarkMode } from '../services/storageService';

export default function RecycleBinScreen({ navigation }) {
  const [deletedHistory, setDeletedHistory] = useState([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const unsubDark = subscribeDarkMode(setIsDark);
    return () => unsubDark();
  }, []);

  const loadData = async () => {
    const records = await getDeletedHistory();
    setDeletedHistory(records);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = async (id) => {
    await restoreHistoryRecord(id);
    loadData();
  };

  const handlePermanentDelete = async (id) => {
    await permanentDeleteHistoryRecord(id);
    loadData();
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, isDark && styles.darkText]}>Recycle Bin</Text>
      </View>

      {deletedHistory.length === 0 ? (
        <View style={styles.emptyView}>
          <Text style={styles.emptyIcon}>🗑️</Text>
          <Text style={[styles.emptyTitle, isDark && styles.darkText]}>Recycle Bin is Empty</Text>
          <Text style={[styles.emptySub, isDark && styles.darkSubtext]}>Deleted scans will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={deletedHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={[styles.reportCard, isDark && styles.darkReportCard]}>
              <View style={styles.imageBox}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.img} />
                ) : (
                  <Text style={{ fontSize: 24 }}>📷</Text>
                )}
              </View>

              <View style={styles.info}>
                <Text style={[styles.patientName, isDark && styles.darkText]}>{item.name}</Text>
                <Text style={[styles.prediction, { color: item.prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
                  {item.prediction}
                </Text>
                <Text style={[styles.date, isDark && styles.darkSubtext]}>Deleted from: {item.date}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleRestore(item.id)} style={styles.actionBtn}>
                  <Text style={styles.restoreText}>↩️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={styles.actionBtn}>
                  <Text style={styles.deleteText}>❌</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  backBtn: { marginRight: 16 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', flex: 1 },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6 },
  
  reportCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3 },
  darkReportCard: { backgroundColor: '#1E293B', borderColor: '#334155' },
  
  imageBox: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 14 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 },
  prediction: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 11, color: '#999' },
  
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 10, marginLeft: 8, backgroundColor: '#F0F0F0', borderRadius: 8 },
  restoreText: { fontSize: 18 },
  deleteText: { fontSize: 18 },
});
