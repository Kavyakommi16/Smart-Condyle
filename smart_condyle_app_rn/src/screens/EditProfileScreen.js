import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, SafeAreaView, ScrollView, Alert, Modal, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getDoctorProfile, saveDoctorProfile, subscribeDarkMode } from '../services/storageService';
import { getSession } from '../services/authService';

export default function EditProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [hospital, setHospital] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [cameraError, setCameraError] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const activeSession = await getSession();
      if (!activeSession) return;
      const p = await getDoctorProfile(activeSession.uid);
      setName(p.name || activeSession.name || '');
      setRole(p.role || '');
      setEmail(p.email || activeSession.email || '');
      setHospital(p.hospital || activeSession.hospital || '');
      setPhone(p.phone || activeSession.fullMobile || activeSession.mobile || '');
      setAvatarUri(p.avatarUri || activeSession.avatarUri || '');
    };
    loadProfile();
  }, []);

  // Manage Live Webcam Stream for Web (PC & Mobile Web)
  useEffect(() => {
    let activeStream = null;

    if (showWebcamModal && Platform.OS === 'web') {
      setCameraError('');
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const constraintsList = [
          { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { facingMode: facingMode } },
          { video: true },
        ];

        const tryGetMedia = async (index = 0) => {
          if (index >= constraintsList.length) {
            setCameraError("Camera access denied or no camera device found. Please check PC camera permissions or pick photo below.");
            return;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraintsList[index]);
            activeStream = stream;
            setWebcamStream(stream);
          } catch (err) {
            console.warn(`Profile camera constraint [${index}] failed:`, err);
            tryGetMedia(index + 1);
          }
        };

        tryGetMedia(0);
      } else {
        setCameraError("Live camera is not supported by your browser.");
      }
    } else {
      setWebcamStream(null);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showWebcamModal, facingMode]);

  // Bind stream to PC HTML5 video element reliably
  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch((err) => console.log("Profile video play error:", err));
    }
  }, [webcamStream, showWebcamModal]);

  // Live Camera Photo Handler
  const handleCameraPhoto = async () => {
    if (Platform.OS === 'web') {
      setShowWebcamModal(true);
    } else {
      // Native Camera on Mobile Devices
      try {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "Camera permission is required to capture profile picture.");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setAvatarUri(result.assets[0].uri);
        }
      } catch (e) {
        Alert.alert("Camera Error", "Could not open native camera.");
      }
    }
  };

  // Capture current webcam frame in 1:1 ratio
  const captureWebcamSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const size = Math.min(width, height);

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Mirror horizontally if front camera
      if (facingMode === 'user') {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }

      const startX = (width - size) / 2;
      const startY = (height - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setAvatarUri(dataUrl);
      closeWebcamModal();
    }
  };

  const closeWebcamModal = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setShowWebcamModal(false);
  };

  // Choose Photo from Gallery
  const handleGalleryPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setAvatarUri(url);
          }
        };
        input.click();
      } else {
        Alert.alert("Error", "Could not pick image from gallery.");
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Doctor Name cannot be empty.");
      return;
    }

    const activeSession = await getSession();
    if (!activeSession) return;
    
    setIsSaving(true);

    const updatedProfile = {
      name: name.trim(),
      role: role.trim(),
      email: email.trim(),
      hospital: hospital.trim(),
      phone: phone.trim(),
      avatarUri,
    };

    try {
      const res = await saveDoctorProfile(activeSession.uid, updatedProfile);
      
      // Removed blocking alerts for instant seamless navigation
      if (res.success) {
        navigation.goBack();
      } else if (Platform.OS === 'web') {
        window.alert("Failed to update profile.");
      } else {
        Alert.alert("Error", "Failed to update profile.");
      }
    } catch (err) {
      if (Platform.OS === 'web') window.alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, isDark && styles.darkText]}>Edit Profile</Text>

        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarIcon}>👨‍⚕️</Text>
            )}
          </View>

          <Text style={styles.photoHint}>Change Profile Picture</Text>

          <View style={styles.photoBtnRow}>
            <TouchableOpacity style={[styles.photoBtn, styles.galleryBtn]} onPress={handleGalleryPhoto}>
              <Text style={styles.photoBtnText}>🖼️ Choose Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Camera Modal Removed */}

        {/* Profile Input Fields */}
        <Text style={styles.label}>Doctor Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Dr. Alex Morgan" />

        <Text style={styles.label}>Specialization / Role</Text>
        <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="e.g. Oral & Maxillofacial Surgeon" />

        <Text style={styles.label}>Email Address (Cannot be changed)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: '#F0F0F0', color: '#999' }]}
          value={email}
          editable={false}
        />

        <Text style={styles.label}>Hospital / Clinic Name</Text>
        <TextInput style={styles.input} value={hospital} onChangeText={setHospital} placeholder="e.g. General Medical Center" />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveBtnText}>{isSaving ? 'SAVING...' : 'SAVE PROFILE CHANGES'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  darkContainer: { backgroundColor: '#0F172A' },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  scrollStyle: { flex: 1, width: '100%' },
  scrollContent: { padding: 24, justifyContent: 'center', flexGrow: 1, paddingBottom: 80 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#007AFF',
    marginBottom: 10,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarIcon: { fontSize: 55 },
  photoHint: { fontSize: 14, color: '#666', marginBottom: 12 },
  photoBtnRow: { flexDirection: 'row' },
  photoBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 8,
  },
  galleryBtn: { backgroundColor: '#34C759' },
  photoBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webcamModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  webcamTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 14 },
  webcamContainer: {
    width: 280,
    height: 280,
    borderRadius: 14,
    backgroundColor: '#000000',
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalBtnRow: { width: '100%', alignItems: 'center' },
  snapBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  snapBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontSize: 14, fontWeight: '600' },
});
