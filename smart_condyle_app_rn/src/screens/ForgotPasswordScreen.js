import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { checkEmailExists, generateOTP, sendRealtimeEmailOTP, resetUserPassword } from '../services/authService';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendResetOTP = async () => {
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail.toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg('Email address must be a valid @gmail.com address.');
      return;
    }

    const exists = await checkEmailExists(cleanEmail);
    if (!exists) {
      setErrorMsg('No registered account found with this email address. Please sign up.');
      return;
    }

    const generatedOTP = generateOTP();
    sendRealtimeEmailOTP(cleanEmail, generatedOTP).catch(err => console.log(err));
    resetUserPassword(cleanEmail, 'TempPass#123').catch(err => console.log(err));

    navigation.navigate('OTPVerification', {
      isResetPassword: true,
      resetEmail: cleanEmail,
      generatedOTP,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your registered email address to verify your account and reset password.</Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. doctor123@gmail.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMsg('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={handleSendResetOTP} activeOpacity={0.7}>
          <Text style={styles.buttonText}>VERIFY EMAIL</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 24, justifyContent: 'center', flex: 1 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24, marginTop: 8 },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 16,
  },
  errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '500' },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CCC', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});
