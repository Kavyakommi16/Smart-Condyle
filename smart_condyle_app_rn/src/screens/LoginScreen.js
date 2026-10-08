import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { loginUser, getSession } from '../services/authService';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');



  const handleLogin = async () => {
    setErrorMsg('');

    if (!identifier.trim() || !password) {
      const msg = 'Please enter your registered email address and password.';
      setErrorMsg(msg);
      return;
    }

    const result = await loginUser(identifier.trim(), password);

    if (!result.success) {
      setErrorMsg(result.message || "Invalid email or password.");
      return;
    }

    navigation.replace('Dashboard', { user: result.user });
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
        <Text style={styles.title}>Smart Condyle</Text>
        <Text style={styles.subtitle}>AI-Based Condyle Fracture Detection</Text>
      </View>

      <View style={styles.form}>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            setErrorMsg('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="none"
          autoComplete="off"
          autoCorrect={false}
          importantForAutofill="no"
        />

        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMsg('');
            }}
            secureTextEntry={hidePassword}
            textContentType="none"
            autoComplete="new-password"
            autoCorrect={false}
            importantForAutofill="no"
          />
          <TouchableOpacity onPress={() => setHidePassword(!hidePassword)}>
            <Text style={styles.toggleText}>{hidePassword ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginBtnText}>LOGIN</Text>
        </TouchableOpacity>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}>Sign Up First</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  header: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
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
  icon: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 15, color: '#666666', marginTop: 4, textAlign: 'center' },
  form: { width: '100%' },

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
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  toggleText: { color: '#007AFF', fontWeight: '600' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { color: '#007AFF', fontSize: 14 },
  loginBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  signupText: { color: '#666666', fontSize: 15 },
  signupLink: { color: '#007AFF', fontSize: 15, fontWeight: 'bold' },
});
