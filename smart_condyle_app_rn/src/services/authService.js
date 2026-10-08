import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@smart_condyle_active_session_v3';

import { Platform } from 'react-native';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.149.189:8000';

// Password complexity regex: min 8 chars, at least 1 letter, 1 number, 1 special character
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\\/]/.test(password);

  if (!hasLetter) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!hasSpecial) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*).' };
  }

  return { valid: true };
};

/**
 * Check if email exists on the backend server
 */
export const checkEmailExists = async (email) => {
  try {
    const response = await fetch(`${API_URL}/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await response.json();
    return data.exists;
  } catch (err) {
    console.warn('Check email API error:', err.message);
    return false;
  }
};

export const checkMobileExists = async (fullMobile) => {
  // Mobile check not needed for centralized backend
  return false;
};

/**
 * Register User via Backend API (shared between app and web)
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        hospital: userData.hospital || '',
        mobile: userData.mobile || '',
      }),
    });
    const data = await response.json();

    if (data.success) {
      return { success: true, user: data.user };
    } else {
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('Register API error:', err.message);
    return { success: false, message: 'Could not connect to server. Please check your connection.' };
  }
};

/**
 * Save session locally (keeps user logged in on this device)
 */
export const saveSession = async (user) => {
  try {
    const data = JSON.stringify(user);
    await AsyncStorage.setItem(SESSION_KEY, data);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_KEY, data);
    }
  } catch (e) {
    console.error("Save Session Error:", e);
  }
};

export const getSession = async () => {
  try {
    const data = await AsyncStorage.getItem(SESSION_KEY);
    if (data) return JSON.parse(data);
    if (typeof window !== 'undefined' && window.localStorage) {
      const webData = window.localStorage.getItem(SESSION_KEY);
      if (webData) return JSON.parse(webData);
    }
  } catch (e) { }
  return null;
};

export const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) { }
};

/**
 * Login User via Backend API (shared between app and web)
 */
export const loginUser = async (identifier, password) => {
  const cleanId = identifier.trim().toLowerCase();

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanId, password }),
    });
    const data = await response.json();

    if (data.success) {
      await saveSession(data.user);
      return { success: true, user: data.user };
    } else {
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('Login API error:', err.message);
    return { success: false, message: 'Could not connect to server. Please check your connection.' };
  }
};

/**
 * Reset Password via Backend API
 */
export const resetUserPassword = async (email, newPassword) => {
  try {
    const response = await fetch(`${API_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), new_password: newPassword }),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, message: 'Could not connect to server.' };
  }
};

export const validateRealtimeEmail = async (email) => {
  if (!email || !email.trim()) {
    return { valid: false, status: 'EMPTY', message: 'Email address is required.' };
  }
  const cleanEmail = email.trim();
  if (!cleanEmail.toLowerCase().endsWith('.com')) {
    return { valid: false, status: 'NO_COM', message: 'Email must end with .com (e.g. doctor@hospital.com).' };
  }
  const comRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
  if (!comRegex.test(cleanEmail)) {
    return { valid: false, status: 'INVALID_FORMAT', message: 'Please enter a valid email address (e.g. kavya@hospital.com).' };
  }

  const isTaken = await checkEmailExists(cleanEmail);
  if (isTaken) {
    return { valid: false, status: 'ALREADY_TAKEN', message: 'Email is already registered. Please log in or use another email.' };
  }

  return { valid: true, status: 'VALID', message: '✅ Valid .com email address.' };
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendRealtimeEmailOTP = async (email, otp, name = 'Medical Specialist') => {
  console.log(`[REALTIME EMAIL DISPATCH] Target: ${email} | Code: ${otp}`);

  try {
    const response = await fetch(`${API_URL}/send-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: otp, name }),
    });
    const resData = await response.json();
    console.log('[BACKEND EMAIL DISPATCH RESPONSE]:', resData);
  } catch (err) {
    console.warn('[BACKEND EMAIL DISPATCH NOTICE]: Backend API fetch notice - fallback active.', err.message);
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification("Smart Condyle Verification Email 📧", {
        body: `Verification Code sent to ${email}: ${otp}`,
        icon: "📧",
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification("Smart Condyle Verification Email 📧", {
            body: `Verification Code sent to ${email}: ${otp}`,
            icon: "📧",
          });
        }
      });
    }
  }
  return { success: true, email, otp };
};

export const clearAllUsersAndSessions = async () => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.clear();
    }
    console.log("✅ Session cleared.");
    return { success: true };
  } catch (e) {
    console.error("Clear error:", e);
    return { success: false, error: e.message };
  }
};
