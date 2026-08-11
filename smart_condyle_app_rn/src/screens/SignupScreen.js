import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { checkEmailExists, checkMobileExists, validatePassword, generateOTP, validateRealtimeEmail, sendRealtimeEmailOTP } from '../services/authService';

const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'US / Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+971', country: 'UAE' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+81', country: 'Japan' },
  { code: '+65', country: 'Singapore' },
  { code: '+966', country: 'Saudi Arabia' },
];

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [hospital, setHospital] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [hidePassword, setHidePassword] = useState(true);

  const handleEmailChange = async (text) => {
    setEmail(text);
    setErrorMsg('');
    if (text.trim().length > 3) {
      const status = await validateRealtimeEmail(text);
      setEmailStatus(status);
    } else {
      setEmailStatus(null);
    }
  };



  const handleSignup = async () => {
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required (e.g. Dr. John Doe).');
      return;
    }
    const cleanName = fullName.trim();

    if (!email.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }
    const cleanEmail = email.trim();

    const emailVal = await validateRealtimeEmail(cleanEmail);
    if (!emailVal.valid) {
      setErrorMsg(emailVal.message);
      return;
    }

    if (!hospital.trim()) {
      setErrorMsg('Hospital or Clinic Name is required.');
      return;
    }
    const cleanHospital = hospital.trim();

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.message);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const generatedOTP = generateOTP();
    sendRealtimeEmailOTP(cleanEmail, generatedOTP).catch(e => console.log(e));

    const pendingUser = {
      name: cleanName,
      email: cleanEmail,
      emailOrPhone: cleanEmail,
      isEmail: true,
      hospital: cleanHospital,
      password,
      createdAt: new Date().toISOString(),
    };

    navigation.navigate('OTPVerification', {
      pendingUser,
      generatedOTP,
    });
  };

  return (
    <View style={styles.rootBackground}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Image source={require('../../assets/logo.png')} style={styles.appLogo} />
        </View>
        <Text style={styles.title}>Create Account</Text>
      </View>
      <Text style={styles.subtitle}>Register to access Smart Condyle AI</Text>



      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Dr. John Doe"
        value={fullName}
        onChangeText={(text) => { setFullName(text); setErrorMsg(''); }}
      />

      <Text style={styles.label}>Email Address * (Email linked to Google Auth)</Text>
      <TextInput
        style={[styles.input, emailStatus && (emailStatus.valid ? styles.validInput : styles.invalidInput)]}
        placeholder="e.g. doctor123@gmail.com"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        autoComplete="email"
      />
      {emailStatus ? (
        <Text style={[styles.realtimeText, emailStatus.valid ? styles.realtimeSuccess : styles.realtimeError]}>
          {emailStatus.message}
        </Text>
      ) : null}
      <Text style={styles.label}>Hospital / Clinic Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. General Medical Center"
        value={hospital}
        onChangeText={(text) => { setHospital(text); setErrorMsg(''); }}
      />

      <View style={styles.emailNoticeBox}>
        <Text style={styles.emailNoticeText}>
          📧 Verification Code (OTP) will be sent to your Email address above.
        </Text>
      </View>

      <Text style={styles.label}>Password *</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Min 8 chars (letters, numbers, & special char)"
          value={password}
          onChangeText={(text) => { setPassword(text); setErrorMsg(''); }}
          secureTextEntry={hidePassword}
          textContentType="newPassword"
          autoComplete="password-new"
        />
        <TouchableOpacity onPress={() => setHidePassword(!hidePassword)}>
          <Text style={styles.toggleText}>{hidePassword ? 'Show' : 'Hide'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.reqHint}>
        🔒 Rules: 8+ chars, contains letters, numbers, and special chars (!@#$%^&*)
      </Text>

      <Text style={styles.label}>Confirm Password *</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={(text) => { setConfirmPassword(text); setErrorMsg(''); }}
        secureTextEntry={hidePassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup} activeOpacity={0.7}>
        <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.bold}>Login</Text>
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootBackground: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
    paddingBottom: 60,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  appLogo: { width: '80%', height: '80%', resizeMode: 'contain' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 16, marginTop: 4 },

  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 16,
  },
  errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '500' },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  emailNoticeBox: {
    backgroundColor: '#E6F0FA',
    borderWidth: 1,
    borderColor: '#B3D7FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  emailNoticeText: { color: '#0056B3', fontSize: 13, fontWeight: '600' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  toggleText: { color: '#007AFF', fontWeight: '600' },
  reqHint: { fontSize: 12, color: '#777', marginBottom: 14, fontStyle: 'italic' },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkRow: { alignItems: 'center', marginBottom: 40 },
  linkText: { color: '#666', fontSize: 15 },
  bold: { color: '#007AFF', fontWeight: 'bold' },
  validInput: { borderColor: '#34C759', borderWidth: 1.5 },
  invalidInput: { borderColor: '#FF3B30', borderWidth: 1.5 },
  realtimeText: { fontSize: 12, marginTop: -10, marginBottom: 12, fontWeight: '600' },
  realtimeSuccess: { color: '#34C759' },
  realtimeError: { color: '#FF3B30' },
});
