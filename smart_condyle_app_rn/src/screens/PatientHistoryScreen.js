import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Alert, Platform, LayoutAnimation, UIManager, TextInput } from 'react-native';
import { getHistory, getPatients, deleteHistoryRecord, clearAllHistory, subscribeDarkMode } from '../services/storageService';

export default function PatientHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const unsubDark = subscribeDarkMode(setIsDark);
    return () => unsubDark();
  }, []);

  const loadData = async () => {
    const records = await getHistory();
    const pats = await getPatients();
    // Sort records by date descending
    records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setHistory(records);
    setPatients(pats);
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

  // Group history by patientId
  const groupedData = {};

  patients.forEach((p) => {
    const pId = p.patientId || p.id;
    if (pId) {
      groupedData[pId] = {
        patientId: pId,
        name: p.name || 'Sample Patient',
        reports: [],
      };
    }
  });

  history.forEach((curr) => {
    const pId = curr.patientId || curr.id || 'P-1001';
    if (!groupedData[pId]) {
      groupedData[pId] = {
        patientId: pId,
        name: curr.name || 'Sample Patient',
        reports: [],
      };
    }
    groupedData[pId].reports.push(curr);
  });
  
  const patientsList = Object.values(groupedData).filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.patientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleExpand = (pId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === pId ? null : pId);
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.darkText]}>Patient Directory & Records</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('RecycleBin')} style={styles.recycleBtn}>
            <Text style={styles.recycleText}>🗑️ Bin</Text>
          </TouchableOpacity>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear Scans</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, isDark && styles.darkSearchInput]}
          placeholder="🔍 Search by Patient Name or ID..."
          placeholderTextColor={isDark ? '#94A3B8' : '#888'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {patientsList.length === 0 ? (
        <View style={styles.emptyView}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={[styles.emptyTitle, isDark && styles.darkText]}>No Patient History</Text>
          <Text style={[styles.emptySub, isDark && styles.darkSubtext]}>Register a patient or analyze an X-ray to build records.</Text>
        </View>
      ) : (
        <FlatList
          data={patientsList}
          keyExtractor={(item) => item.patientId}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.patientId;

            return (
              <View style={[styles.patientGroup, isDark && styles.darkPatientGroup]}>
                <TouchableOpacity
                  style={[
                    styles.patientHeader, 
                    isDark && styles.darkPatientHeader,
                    isExpanded && styles.patientHeaderExpanded
                  ]}
                  onPress={() => toggleExpand(item.patientId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarEmoji}>👤</Text>
                  </View>
                  <View style={styles.patientHeaderInfo}>
                    <Text style={[styles.patientName, isDark && styles.darkText]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.patientIdText}>
                      ID: <Text style={styles.idHighlight}>{item.patientId}</Text>
                    </Text>
                  </View>
                  <View style={styles.reportBadge}>
                    <Text style={styles.reportBadgeText}>
                      {item.reports.length} {item.reports.length === 1 ? 'Scan' : 'Scans'}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.patientDetailsBox}>
                      <Text style={[styles.detailText, isDark && styles.darkSubtext]}>
                        <Text style={styles.bold}>Age/Gender:</Text> {item.reports[0]?.age || item.age || '30'} yrs / {item.reports[0]?.gender || item.gender || 'Male'}
                      </Text>
                      <Text style={[styles.detailText, isDark && styles.darkSubtext]}>
                        <Text style={styles.bold}>Symptoms:</Text> {item.reports[0]?.symptoms || item.symptoms || 'None reported'}
                      </Text>
                      <Text style={[styles.detailText, isDark && styles.darkSubtext]}>
                        <Text style={styles.bold}>Injury:</Text> {item.reports[0]?.injury || item.injury || 'None reported'}
                      </Text>
                    </View>

                    <View style={styles.reportsList}>
                      {item.reports.length === 0 ? (
                        <View style={styles.noScanCard}>
                          <Text style={styles.noScanText}>ℹ️ No scans uploaded for this patient yet.</Text>
                        </View>
                      ) : (
                      item.reports.map((report) => (
                        <TouchableOpacity
                          key={report.id}
                          style={[styles.reportCard, isDark && styles.darkReportCard]}
                          onPress={() => handleOpenRecord(report)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.imageBox}>
                            {report.imageUri ? (
                              <Image source={{ uri: report.imageUri }} style={styles.img} />
                            ) : (
                              <Text style={{ fontSize: 24 }}>📷</Text>
                            )}
                          </View>
  
                          <View style={styles.info}>
                            <Text style={[styles.prediction, { color: report.prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
                              {report.prediction}
                            </Text>
  
                            <Text style={[styles.meta, isDark && styles.darkSubtext]}>
                              Conf: {report.confidence}% | Severity: {report.severity}
                            </Text>
  
                            <Text style={[styles.date, isDark && styles.darkSubtext]}>{report.date}</Text>
                          </View>
  
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(report.id); }}>
                            <Text style={styles.deleteBtn}>🗑️</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))
                    )}
                    </View>
                  </View>
                )}
              </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', flex: 1 },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  recycleBtn: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  recycleText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  clearBtn: { backgroundColor: '#FF3B3020', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 13 },
  
  searchContainer: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  darkSearchInput: { backgroundColor: '#1E293B', borderColor: '#334155', color: '#FFF' },
  
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6 },
  
  patientGroup: { marginBottom: 16 },
  darkPatientGroup: {},
  patientHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  patientHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  darkPatientHeader: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6F0FA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarEmoji: { fontSize: 20 },
  patientHeaderInfo: { flex: 1 },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 },
  patientIdText: { fontSize: 13, color: '#666' },
  idHighlight: { color: '#007AFF', fontWeight: 'bold' },
  reportBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 10 },
  reportBadgeText: { fontSize: 12, fontWeight: '600', color: '#444' },
  expandIcon: { fontSize: 14, color: '#007AFF', paddingHorizontal: 6 },

  expandedSection: {
    backgroundColor: '#F8FAFC', 
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    borderWidth: 1, borderTopWidth: 0, borderColor: '#F0F0F0',
  },
  patientDetailsBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailText: { fontSize: 13, color: '#444', marginBottom: 4 },
  bold: { fontWeight: 'bold' },

  reportsList: { 
    paddingLeft: 12, paddingRight: 12, paddingBottom: 12, paddingTop: 10,
  },
  noScanCard: { padding: 16, alignItems: 'center' },
  noScanText: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  
  reportCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3 },
  darkReportCard: { backgroundColor: '#0F172A', borderColor: '#334155' },
  
  imageBox: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 14 },
  prediction: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 12, color: '#666', marginBottom: 2 },
  date: { fontSize: 11, color: '#999' },
  deleteBtn: { fontSize: 18, padding: 8, color: '#FF3B30' },
});
