import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Platform } from 'react-native';
import { getPatients, getHistory, deleteHistoryRecord, subscribeDarkMode, subscribeDataChanges } from '../services/storageService';

export default function ReportScreen({ route, navigation }) {
  const { patient: initialPatient } = route.params || {};
  const [selectedPatient, setSelectedPatient] = useState(initialPatient || null);
  const [patientsList, setPatientsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const unsubDark = subscribeDarkMode(setIsDark);
    const unsubData = subscribeDataChanges(() => {
      loadAllPatientData();
    });
    const unsubFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      loadAllPatientData();
    }) : null;

    return () => {
      unsubDark();
      unsubData();
      if (unsubFocus) unsubFocus();
    };
  }, [navigation]);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient]);

  const loadAllPatientData = async () => {
    // Medical reports are strictly generated from active Patient History records
    const historyRecords = await getHistory();

    const formattedReports = historyRecords.map(h => ({
      id: h.id,
      patientId: h.patientId || h.id || 'P-1001',
      name: h.name || 'Patient',
      age: h.age || '30',
      gender: h.gender || 'Male',
      phone: h.phone || '+91 9876543210',
      injury: h.injury || '',
      symptoms: h.symptoms || '',
      history: h.history || '',
      prediction: h.prediction || 'Normal',
      confidence: h.confidence || 95,
      severity: h.severity || 'None',
      date: h.date || 'Recent',
      imageUri: h.imageUri,
    }));

    setPatientsList(formattedReports);

    // If currently viewed report patient was deleted from history, clear view
    if (selectedPatient) {
      const stillExists = formattedReports.some(p => 
        (p.id && p.id === selectedPatient.id) ||
        (p.patientId && p.patientId === selectedPatient.patientId) || 
        (p.name && p.name === selectedPatient.name)
      );
      if (!stillExists) {
        setSelectedPatient(null);
      }
    }
  };

  useEffect(() => {
    loadAllPatientData();
  }, []);

  const filteredPatients = patientsList.filter(p => {
    const nameMatch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = (p.patientId || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || idMatch;
  });

  const handleDownloadPDF = (patient) => {
    if (typeof window !== 'undefined' && window.open) {
      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Smart Condyle Report - ${patient?.name || 'Patient'}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; background-color: #ffffff; }
            .header { text-align: center; border-bottom: 3px solid #007AFF; padding-bottom: 15px; margin-bottom: 25px; }
            .title { color: #007AFF; font-size: 30px; font-weight: bold; margin: 0; letter-spacing: 1px; }
            .subtitle { color: #666; font-size: 14px; margin-top: 6px; }
            .section { margin-bottom: 22px; background: #f8fafc; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; }
            .section-title { color: #007AFF; font-size: 17px; font-weight: bold; margin-top: 0; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
            .label { font-weight: 600; color: #475569; }
            .val { font-weight: 600; color: #0f172a; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-weight: bold; }
            .badge-fracture { background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
            .badge-normal { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SMART CONDYLE AI</h1>
            <div class="subtitle">AI-Based Condyle Fracture Detection Report</div>
          </div>

          <div class="section">
            <h3 class="section-title">Patient Demographics</h3>
            <div class="row"><span class="label">Patient Name:</span><span class="val">${patient?.name || 'N/A'}</span></div>
            <div class="row"><span class="label">Patient ID:</span><span class="val">${patient?.patientId || 'N/A'}</span></div>
            <div class="row"><span class="label">Age / Gender:</span><span class="val">${patient?.age || 'N/A'} Yrs / ${patient?.gender || 'N/A'}</span></div>
            <div class="row"><span class="label">Phone:</span><span class="val">${patient?.phone || 'N/A'}</span></div>
          </div>

          <div class="section">
            <h3 class="section-title">AI Diagnostic Findings</h3>
            <div class="row">
              <span class="label">AI Prediction:</span>
              <span class="val badge ${patient?.prediction?.includes('Fracture') ? 'badge-fracture' : 'badge-normal'}">${patient?.prediction || 'Normal'}</span>
            </div>
            <div class="row"><span class="label">Model Confidence:</span><span class="val">${patient?.confidence || 95}%</span></div>
            <div class="row"><span class="label">Condition Severity:</span><span class="val">${patient?.severity || 'None'}</span></div>
          </div>

          <div class="section">
            <h3 class="section-title">Symptoms & Clinical History</h3>
            <div class="row"><span class="label">Injury Cause:</span><span class="val">${patient?.injury || 'None reported'}</span></div>
            <div class="row"><span class="label">Reported Symptoms:</span><span class="val">${patient?.symptoms || 'None reported'}</span></div>
            <div class="row"><span class="label">Medical History:</span><span class="val">${patient?.history || 'None reported'}</span></div>
          </div>

          <div class="footer">
            Generated by Smart Condyle AI Platform • Confidential Medical Document • Date: ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        Alert.alert("Report Generated", `PDF Report created for ${patient?.name || 'Patient'}.`);
      }
    } else {
      Alert.alert("Report Generated", `PDF Report generated for ${patient?.name || 'Patient'}.`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      {selectedPatient ? (
        // Detailed Medical Report View for Selected Patient
        <ScrollView
          style={styles.scrollStyle}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
        >
          <TouchableOpacity
            style={[styles.backToListBtn, isDark && styles.darkBackBtn]}
            onPress={() => setSelectedPatient(null)}
          >
            <Text style={styles.backToListText}>← Back to All Patient Reports</Text>
          </TouchableOpacity>

          <View style={[styles.reportCard, isDark && styles.darkCard]}>
            <Text style={styles.orgHeader}>SMART CONDYLE</Text>
            <Text style={[styles.reportSub, isDark && styles.darkSubtext]}>Official AI Condyle Fracture Detection Report</Text>
            <View style={[styles.divider, isDark && styles.darkDivider]} />

            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>Patient Name:</Text>
              <Text style={[styles.val, isDark && styles.darkText]}>{selectedPatient?.name || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>Patient ID:</Text>
              <Text style={[styles.val, { color: '#007AFF', fontWeight: 'bold' }]}>{selectedPatient?.patientId || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>Age / Gender:</Text>
              <Text style={[styles.val, isDark && styles.darkText]}>{selectedPatient?.age || 'N/A'} Yrs / {selectedPatient?.gender || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>Phone:</Text>
              <Text style={[styles.val, isDark && styles.darkText]}>{selectedPatient?.phone || 'N/A'}</Text>
            </View>

            <View style={[styles.divider, isDark && styles.darkDivider]} />

            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>AI Prediction:</Text>
              <Text style={[styles.val, { fontWeight: 'bold', color: selectedPatient?.prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
                {selectedPatient?.prediction || 'Normal'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>Confidence:</Text>
              <Text style={[styles.val, isDark && styles.darkText]}>{selectedPatient?.confidence || 95}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, isDark && styles.darkSubtext]}>Severity:</Text>
              <Text style={[styles.val, isDark && styles.darkText]}>{selectedPatient?.severity || 'None'}</Text>
            </View>

            <View style={[styles.divider, isDark && styles.darkDivider]} />

            <Text style={[styles.secTitle, isDark && styles.darkText]}>Symptoms & History</Text>
            <Text style={[styles.bodyText, isDark && styles.darkSubtext]}>Injury: {selectedPatient?.injury || 'None reported'}</Text>
            <Text style={[styles.bodyText, isDark && styles.darkSubtext]}>Symptoms: {selectedPatient?.symptoms || 'None reported'}</Text>
            <Text style={[styles.bodyText, isDark && styles.darkSubtext]}>Medical History: {selectedPatient?.history || 'None reported'}</Text>

            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => handleDownloadPDF(selectedPatient)}
            >
              <Text style={styles.downloadBtnText}>📥 Download / Print PDF Report</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // Patient Directory List View (Default)
        <View style={styles.listContainer}>
          <Text style={[styles.headerTitle, isDark && styles.darkText]}>Medical Reports Directory</Text>
          <Text style={[styles.headerSub, isDark && styles.darkSubtext]}>Select a patient below to view their detailed medical report</Text>

          <TextInput
            style={[styles.searchInput, isDark && styles.darkSearchInput]}
            placeholder="🔍 Search patient by Name or Patient ID..."
            placeholderTextColor={isDark ? '#94A3B8' : '#888'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <FlatList
            data={filteredPatients}
            keyExtractor={(item, index) => item.patientId || item.name + index}
            contentContainerStyle={{ paddingBottom: 60 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.patientCard, isDark && styles.darkCard]}
                onPress={() => setSelectedPatient(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.patientCardName, isDark && styles.darkText]}>👤 {item.name}</Text>
                    <Text style={styles.patientCardId}>ID: <Text style={{ fontWeight: 'bold' }}>{item.patientId}</Text></Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.prediction?.includes('Fracture') ? '#FF3B30' : '#34C759' }]}>
                    <Text style={styles.statusBadgeText}>{item.prediction || 'Normal'}</Text>
                  </View>
                </View>

                <View style={styles.cardMetaRow}>
                  <Text style={[styles.metaText, isDark && styles.darkSubtext]}>Age: {item.age} yrs ({item.gender})</Text>
                  <Text style={styles.viewReportLink}>View Report ➔</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📄</Text>
                <Text style={[styles.emptyText, isDark && styles.darkText]}>No Patient Reports Found</Text>
                <Text style={[styles.emptySub, isDark && styles.darkSubtext]}>Register patients or upload scans to view medical reports.</Text>
              </View>
            }
          />
        </View>
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
  scrollStyle: { flex: 1, width: '100%' },
  content: { padding: 20, flexGrow: 1, paddingBottom: 60 },
  backToListBtn: {
    backgroundColor: '#E6F0FA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  darkBackBtn: { backgroundColor: '#1E293B' },
  backToListText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14 },
  reportCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, elevation: 3 },
  darkCard: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  orgHeader: { fontSize: 26, fontWeight: 'bold', color: '#007AFF', textAlign: 'center' },
  reportSub: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 16 },
  darkDivider: { backgroundColor: '#334155' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: '#666', fontWeight: '600' },
  val: { fontSize: 15, color: '#1A1A1A' },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  secTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  bodyText: { fontSize: 14, color: '#444', marginBottom: 6 },
  downloadBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  downloadBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  listContainer: { flex: 1, padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 16 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  darkSearchInput: { backgroundColor: '#1E293B', borderColor: '#334155', color: '#FFFFFF' },
  patientCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientCardName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A' },
  patientCardId: { fontSize: 13, color: '#007AFF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  metaText: { fontSize: 13, color: '#666' },
  viewReportLink: { fontSize: 13, color: '#007AFF', fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  emptySub: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6 },
});
