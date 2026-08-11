import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { registerUser, saveSession, resetUserPassword, validatePassword, generateOTP, sendRealtimeEmailOTP } from '../services/authService';
import { saveDoctorProfile } from '../services/storageService';

export default function OTPVerificationScreen({ route, navigation }) {
  const { pendingUser, generatedOTP, isResetPassword, resetEmail } = route.params || {};
  const [currentOTP, setCurrentOTP] = useState(generatedOTP || '');
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(30);
  const [isVerifiedForReset, setIsVerifiedForReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);

  const destination = isResetPassword ? resetEmail : (pendingUser?.email || 'your email');

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleResendOTP = async () => {
    if (timer > 0) return;
    const newCode = generateOTP();
    setCurrentOTP(newCode);
    setTimer(30);
    setErrorMsg('');
    await sendRealtimeEmailOTP(destination, newCode);
    Alert.alert("Real-Time OTP Resent 📧", `A new 6-digit verification code has been dispatched to ${destination}`);
  };

  const verifyCode = async (codeToTest) => {
    setErrorMsg('');

    if (!codeToTest || codeToTest.trim() !== currentOTP) {
      setErrorMsg('otp is incorrect');
      return;
    }



    if (isResetPassword) {
      setIsVerifiedForReset(true);
      Alert.alert("OTP Verified 🎉", "Please enter your new password below.");
      return;
    }

    const res = await registerUser(pendingUser);
    if (res.success) {
      await saveSession(pendingUser);
      await saveDoctorProfile({
        name: pendingUser.name || 'Dr. Medical Specialist',
        role: 'Oral & Maxillofacial Surgeon',
        email: pendingUser.email,
        phone: pendingUser.fullMobile || pendingUser.mobile || '+91 9876543210',
        hospital: pendingUser.hospital || 'General Medical Center',
        department: pendingUser.department || 'Maxillofacial Surgery',
      });
      setSuccessMsg('verification completed');
      setTimeout(() => navigation.replace('Login'), 1500);
    } else {
      Alert.alert("Error", res.error || "Could not complete registration");
    }
  };

  const handleVerify = () => verifyCode(otp);

  const handleOtpChange = (text) => {
    const clean = text.replace(/[^0-9]/g, '');
    setOtp(clean);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveNewPassword = async () => {
    setErrorMsg('');

    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.message);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = await resetUserPassword(resetEmail, newPassword);
    if (res.success) {
      Alert.alert(
        "Password Updated 🎉",
        "Your password has been reset successfully. Please log in with your new password.",
        [{ text: "Go to Login", onPress: () => navigation.replace('Login') }]
      );
    } else {
      setErrorMsg(res.message || "Failed to update password.");
    }
  };

  return (
    <View style={styles.rootBackground}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>📧</Text>
        </View>

        <Text style={styles.title}>
          {isResetPassword ? 'Reset Password Verification' : 'Email OTP Verification'}
        </Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit security code sent to your email to verify your identity.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>📩 Check Your Email Inbox</Text>
          <Text style={styles.infoCardText}>
            A 6-digit verification code has been dispatched directly to{' '}
            <Text style={styles.boldEmail}>{destination}</Text>. Please open your email inbox (or check your spam folder) and enter the code below.
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ {successMsg}</Text>
          </View>
        ) : null}

        {!isVerifiedForReset ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-Digit Email OTP"
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="numeric"
              maxLength={6}
            />

            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
              <Text style={styles.verifyBtnText}>
                {isResetPassword ? 'CONFIRM OTP' : 'CONFIRM'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resendBtn, timer > 0 && { opacity: 0.6 }]}
              onPress={handleResendOTP}
              disabled={timer > 0}
            >
              <Text style={styles.resendText}>
                {timer > 0 ? `Resend Email OTP in ${timer}s` : "Didn't receive code? Resend Email OTP"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.resetPassContainer}>
            <Text style={styles.resetTitle}>Create New Password</Text>

            <Text style={styles.label}>New Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => { setNewPassword(text); setErrorMsg(''); }}
                secureTextEntry={hidePassword}
              />
              <TouchableOpacity onPress={() => setHidePassword(!hidePassword)}>
                <Text style={styles.toggleText}>{hidePassword ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.reqHint}>
              🔒 Rules: 8+ chars, letters, numbers, and special chars (!@#$%^&*)
            </Text>

            <Text style={styles.label}>Confirm New Password *</Text>
            <TextInput
              style={styles.inputStyle}
              placeholder="Re-enter new password"
              value={confirmNewPassword}
              onChangeText={(text) => { setConfirmNewPassword(text); setErrorMsg(''); }}
              secureTextEntry={hidePassword}
            />

            <TouchableOpacity style={styles.savePassBtn} onPress={handleSaveNewPassword}>
              <Text style={styles.savePassBtnText}>UPDATE PASSWORD & LOGIN</Text>
            </TouchableOpacity>
          </View>
        )}
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
  scrollContent: { padding: 24, justifyContent: 'center', alignItems: 'center', flexGrow: 1 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 6, textAlign: 'center' },
  infoCard: {
    backgroundColor: '#E6F0FA',
    borderWidth: 1,
    borderColor: '#B3D7FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  infoCardTitle: { fontSize: 15, color: '#0056B3', fontWeight: 'bold', marginBottom: 4 },
  infoCardText: { fontSize: 13, color: '#334E68', textAlign: 'center', lineHeight: 18 },
  boldEmail: { color: '#007AFF', fontWeight: 'bold' },
  errorBox: {
    backgroundColor: '#FFEFEF',
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  successText: { color: '#2E7D32', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  verifyBtn: {
    backgroundColor: '#34C759',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  resendBtn: { marginTop: 10 },
  resendText: { color: '#666', fontSize: 14 },
  resendBold: { color: '#007AFF', fontWeight: 'bold' },
  resetPassContainer: { width: '100%', marginTop: 10 },
  resetTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6, marginTop: 4 },
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
  inputStyle: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  savePassBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  savePassBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
