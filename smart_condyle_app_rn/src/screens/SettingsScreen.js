import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { saveDarkMode, subscribeDarkMode } from '../services/storageService';
import { clearSession } from '../services/authService';

export default function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeDarkMode(setDarkMode);
    return () => unsub();
  }, []);

  const handleToggleDarkMode = async (val) => {
    setDarkMode(val);
    await saveDarkMode(val);
  };

  const handleLogout = async () => {
    await clearSession();
    // Use reset to clear navigation history and go to Login
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.title, darkMode && styles.darkText]}>Settings</Text>

        <View style={[styles.row, darkMode && styles.darkRow]}>
          <View>
            <Text style={[styles.label, darkMode && styles.darkText]}>Dark Mode Theme</Text>
            <Text style={[styles.sublabel, darkMode && styles.darkSublabel]}>Enable dark background across all screens</Text>
          </View>
          <Switch value={darkMode} onValueChange={handleToggleDarkMode} />
        </View>

        <View style={[styles.row, darkMode && styles.darkRow]}>
          <View>
            <Text style={[styles.label, darkMode && styles.darkText]}>Notifications</Text>
            <Text style={[styles.sublabel, darkMode && styles.darkSublabel]}>Analysis completed & system alerts</Text>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>

        {/* About App Clickable Item */}
        <TouchableOpacity style={[styles.row, darkMode && styles.darkRow]} onPress={() => setShowAboutModal(true)}>
          <View>
            <Text style={[styles.label, darkMode && styles.darkText]}>About App</Text>
            <Text style={[styles.sublabel, darkMode && styles.darkSublabel]}>App version, AI model details & info</Text>
          </View>
          <Text style={styles.val}>v1.0.0 ➔</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>

        {/* About App Modal */}
        <Modal
          visible={showAboutModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAboutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, darkMode && styles.darkModalContent]}>
              <View style={styles.modalIconCircle}>
                <Text style={styles.modalIcon}>🩺</Text>
              </View>

              <Text style={[styles.modalTitle, darkMode && styles.darkText]}>Smart Condyle AI</Text>
              <Text style={styles.modalVersion}>Version 1.0.0 (React Native JS)</Text>
              <View style={styles.divider} />

              <Text style={[styles.modalText, darkMode && styles.darkSublabel]}>
                Smart Condyle is an AI-powered medical decision support platform for detecting jaw condyle fractures from X-ray and CT scans.
              </Text>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, darkMode && styles.darkSublabel]}>AI Framework:</Text>
                <Text style={[styles.infoVal, darkMode && styles.darkText]}>TensorFlow Lite CNN</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, darkMode && styles.darkSublabel]}>Backend API:</Text>
                <Text style={[styles.infoVal, darkMode && styles.darkText]}>FastAPI (Python 3.11)</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, darkMode && styles.darkSublabel]}>Frontend:</Text>
                <Text style={[styles.infoVal, darkMode && styles.darkText]}>React Native JS (Expo)</Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowAboutModal(false)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  darkContainer: { backgroundColor: '#0F172A' },
  scrollStyle: { flex: 1, width: '100%' },
  content: { padding: 20, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1A1A1A' },
  darkText: { color: '#F8FAFC' },
  darkSublabel: { color: '#94A3B8' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  darkRow: { borderBottomColor: '#334155' },
  label: { fontSize: 16, color: '#333', fontWeight: '500' },
  sublabel: { fontSize: 13, color: '#888', marginTop: 2 },
  val: { fontSize: 14, color: '#007AFF', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  darkModalContent: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIcon: { fontSize: 36 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  modalVersion: { fontSize: 14, color: '#007AFF', marginTop: 4, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E0E0E0', width: '100%', marginVertical: 16 },
  modalText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6 },
  infoLabel: { flex: 1, fontSize: 15, color: '#666', fontWeight: '500' },
  infoVal: { fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  closeBtn: { marginTop: 24, paddingVertical: 12, backgroundColor: '#007AFF', borderRadius: 10, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    marginTop: 40,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
