import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Platform } from 'react-native';
import { savePatient } from '../services/storageService';

export default function PatientRegistrationScreen({ navigation }) {
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [injury, setInjury] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [history, setHistory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !patientId.trim() || !age.trim()) {
      Alert.alert("Error", "Please fill all required fields (Name, Patient ID, and Age).");
      return;
    }

    const numAge = parseInt(age, 10);
    if (isNaN(numAge) || numAge < 1 || numAge > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age between 1 and 120 years.");
      return;
    }

    const patient = {
      patientId: patientId.trim(),
      name: name.trim(),
      age: age.trim(),
      gender,
      phone: phone.trim(),
      injury: injury.trim(),
      symptoms: symptoms.trim(),
      history: history.trim(),
      prediction: "Not Analyzed",
      confidence: 0,
      severity: "Unknown",
      imageUri: "",
    };

    setIsSaving(true);
    
    try {
      await savePatient(patient);
      // Removed blocking alerts for instant seamless navigation
      navigation.replace('UploadScan', { patient });
    } catch (err) {
      if (Platform.OS === 'web') window.alert("Failed to register");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Patient Registration</Text>

        <Text style={styles.label}>Patient Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. John Doe" value={name} onChangeText={setName} />

        <Text style={styles.label}>Patient ID *</Text>
        <TextInput style={styles.input} placeholder="e.g. P-1001" value={patientId} onChangeText={setPatientId} />

        <Text style={styles.label}>Age (Numeric Only) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 35 (Numbers only)"
          value={age}
          onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={3}
        />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {['Male', 'Female', 'Other'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderChip, gender === g && styles.activeChip]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.chipText, gender === g && styles.activeChipText]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Injury Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Details of jaw injury" value={injury} onChangeText={setInjury} multiline spellCheck={false} autoCorrect={false} />

        <Text style={styles.label}>Symptoms</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Pain, swelling, difficulty chewing..." value={symptoms} onChangeText={setSymptoms} multiline spellCheck={false} autoCorrect={false} />

        <Text style={styles.label}>Medical History</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Previous fractures, surgeries..." value={history} onChangeText={setHistory} multiline spellCheck={false} autoCorrect={false} />

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={isSaving}>
          <Text style={styles.registerBtnText}>{isSaving ? 'Registering...' : 'Register Patient'}</Text>
        </TouchableOpacity>
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
  scrollStyle: { flex: 1, width: '100%' },
  content: { padding: 20, flexGrow: 1, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1A1A1A' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#CCC', borderRadius: 10, padding: 12, fontSize: 16 },
  textArea: { height: 70, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', marginBottom: 10 },
  genderChip: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#CCC', borderRadius: 10, alignItems: 'center', marginRight: 8 },
  activeChip: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333', fontWeight: '600' },
  activeChipText: { color: '#FFF' },
  registerBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
