import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.149.189:8000';

// Get current logged-in user's UID
const getUID = async () => {
  try {
    const SESSION_KEY = '@smart_condyle_active_session_v3';
    const data = await AsyncStorage.getItem(SESSION_KEY);
    if (data) {
      const user = JSON.parse(data);
      return user.uid || null;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const webData = window.localStorage.getItem(SESSION_KEY);
      if (webData) {
        const user = JSON.parse(webData);
        return user.uid || null;
      }
    }
  } catch (e) {}
  return null;
};

// ──────────────── Patients ────────────────
export const savePatient = async (patient) => {
  const uid = await getUID();
  if (!uid) return;
  try {
    await fetch(`${API_URL}/patients/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, patient }),
    });
  } catch (e) {
    console.warn('Save patient API error:', e.message);
  }
};

export const getPatients = async () => {
  const uid = await getUID();
  if (!uid) return [];
  try {
    const response = await fetch(`${API_URL}/patients/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    const data = await response.json();
    return data.patients || [];
  } catch (e) {
    console.warn('Get patients API error:', e.message);
    return [];
  }
};

export const getLastPatient = async () => {
  const patients = await getPatients();
  return patients.length > 0 ? patients[patients.length - 1] : null;
};

// ──────────────── History ────────────────
export const saveHistoryRecord = async (record) => {
  const uid = await getUID();
  if (!uid) return;
  try {
    await fetch(`${API_URL}/history/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, record }),
    });
  } catch (e) {
    console.warn('Save history API error:', e.message);
  }
};

export const getHistory = async () => {
  const uid = await getUID();
  if (!uid) return [];
  try {
    const response = await fetch(`${API_URL}/history/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    const data = await response.json();
    return data.history || [];
  } catch (e) {
    console.warn('Get history API error:', e.message);
    return [];
  }
};

const dataChangeListeners = new Set();

const notifyDataSubscribers = () => {
  dataChangeListeners.forEach(listener => listener());
};

export const subscribeDataChanges = (listener) => {
  dataChangeListeners.add(listener);
  return () => dataChangeListeners.delete(listener);
};

export const deleteHistoryRecord = async (id) => {
  const uid = await getUID();
  if (!uid) return;
  try {
    await fetch(`${API_URL}/history/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, record_id: id }),
    });
    notifyDataSubscribers();
  } catch (e) {
    console.warn('Delete history API error:', e.message);
  }
};

export const getDeletedHistory = async () => {
  const uid = await getUID();
  if (!uid) return [];
  try {
    const response = await fetch(`${API_URL}/history/deleted/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    const data = await response.json();
    return data.history || [];
  } catch (e) {
    console.warn('Get deleted history API error:', e.message);
    return [];
  }
};

export const restoreHistoryRecord = async (id) => {
  const uid = await getUID();
  if (!uid) return;
  try {
    await fetch(`${API_URL}/history/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, record_id: id }),
    });
    notifyDataSubscribers();
  } catch (e) {
    console.warn('Restore history API error:', e.message);
  }
};

export const permanentDeleteHistoryRecord = async (id) => {
  const uid = await getUID();
  if (!uid) return;
  try {
    await fetch(`${API_URL}/history/permanent_delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, record_id: id }),
    });
    notifyDataSubscribers();
  } catch (e) {
    console.warn('Permanent delete history API error:', e.message);
  }
};

export const clearAllHistory = async () => {
  const uid = await getUID();
  if (!uid) return;
  try {
    await fetch(`${API_URL}/history/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    notifyDataSubscribers();
  } catch (e) {
    console.warn('Clear history API error:', e.message);
  }
};

// ──────────────── Doctor Profile ────────────────
export const saveDoctorProfile = async (uid, profile) => {
  if (!uid) return { success: false, error: 'No user ID provided' };
  try {
    const response = await fetch(`${API_URL}/profile/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, profile }),
    });
    const data = await response.json();
    return data;
  } catch (e) {
    console.warn('Save profile API error:', e.message);
    return { success: false, error: e.message };
  }
};

export const getDoctorProfile = async (uid) => {
  if (!uid) return {};
  try {
    const response = await fetch(`${API_URL}/profile/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    const data = await response.json();
    return data.profile || {};
  } catch (e) {
    console.warn('Get profile API error:', e.message);
    return {};
  }
};

// ──────────────── Dark Mode (local only) ────────────────
const DARK_MODE_KEY = '@smart_condyle_dark_mode';
let memoryDarkMode = false;
const darkModeListeners = new Set();

export const saveDarkMode = async (isDark) => {
  try {
    memoryDarkMode = isDark;
    await AsyncStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDark));
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDark));
    }
    darkModeListeners.forEach(listener => listener(isDark));
  } catch (e) {
    console.log("Dark Mode save error:", e);
  }
};

export const getDarkMode = async () => {
  try {
    const data = await AsyncStorage.getItem(DARK_MODE_KEY);
    if (data !== null) {
      const parsed = JSON.parse(data);
      memoryDarkMode = parsed;
      return parsed;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const webData = window.localStorage.getItem(DARK_MODE_KEY);
      if (webData !== null) {
        memoryDarkMode = JSON.parse(webData);
        return memoryDarkMode;
      }
    }
    return memoryDarkMode;
  } catch (e) {
    return memoryDarkMode;
  }
};

export const subscribeDarkMode = (listener) => {
  darkModeListeners.add(listener);
  listener(memoryDarkMode);
  return () => darkModeListeners.delete(listener);
};
