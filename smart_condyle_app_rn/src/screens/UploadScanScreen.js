import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, ScrollView, Alert, Modal, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { subscribeDarkMode } from '../services/storageService';

export default function UploadScanScreen({ route, navigation }) {
  const { patient } = route.params || {};
  const [imageUri, setImageUri] = useState(null);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // Default 'environment' (back camera) for CT scans
  const [cameraError, setCameraError] = useState('');
  const [isDark, setIsDark] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeDarkMode(setIsDark);
    return () => unsub();
  }, []);

  // Manage Live Webcam Stream for Web (PC & Mobile Web)
  useEffect(() => {
    let activeStream = null;

    if (showWebcamModal && Platform.OS === 'web') {
      setCameraError('');
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        // Try simple video constraint first for maximum PC desktop webcam compatibility
        const constraintsList = [
          { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { facingMode: facingMode } },
          { video: true },
        ];

        const tryGetMedia = async (index = 0) => {
          if (index >= constraintsList.length) {
            setCameraError("Camera access denied or no camera device found. Please check PC camera permissions or pick file below.");
            return;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraintsList[index]);
            activeStream = stream;
            setWebcamStream(stream);
          } catch (err) {
            console.warn(`Camera constraint [${index}] failed:`, err);
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
      videoRef.current.play().catch((err) => console.log("Video play error:", err));
    }
  }, [webcamStream, showWebcamModal]);

  // 1. Take Live Camera Photo (WebCam on Browser or Native Camera on Mobile)
  const takeCameraPhoto = async () => {
    if (Platform.OS === 'web') {
      setShowWebcamModal(true);
    } else {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Camera permission is required.");
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setImageUri(result.assets[0].uri);
        }
      } catch (e) {
        Alert.alert("Camera Error", "Could not open camera.");
      }
    }
  };

  // Capture current webcam frame in 1:1 Square
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

      if (facingMode === 'user') {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }

      const startX = (width - size) / 2;
      const startY = (height - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImageUri(dataUrl);
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

  // 2. Choose Photo from Gallery
  const pickGalleryImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
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
            setImageUri(url);
          }
        };
        input.click();
      } else {
        Alert.alert("Error", "Could not pick image");
      }
    }
  };

  const handleUpload = () => {
    if (!imageUri) {
      Alert.alert("No Image Selected", "Please select or capture a CT scan image in square format.");
      return;
    }

    navigation.navigate('Analysis', {
      imageUri,
      patient,
    });
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.title, isDark && styles.darkText]}>Upload Jaw CT Scan</Text>
        <Text style={[styles.subtitle, isDark && styles.darkSubtext]}>Upload or capture a 1:1 Square CT/X-ray scan for AI Analysis</Text>

        {/* Square Image Box (1:1 Aspect Ratio) */}
        <View style={styles.imageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>🩻</Text>
              <Text style={styles.placeholderText}>Square 1:1 Scan Container</Text>
              <Text style={styles.placeholderSub}>Select or capture CT scan</Text>
            </View>
          )}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.chooseBtn} onPress={takeCameraPhoto}>
            <Text style={styles.chooseBtnText}>📷 Live Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.chooseBtn, styles.galleryBtn]} onPress={pickGalleryImage}>
            <Text style={styles.chooseBtnText}>🖼️ Choose Gallery</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
          ⚡ Or Choose Sample Clinical CT Scans:
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8 }}
            onPress={() => setImageUri('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%230b0f19"/><circle cx="112" cy="112" r="80" stroke="%2338bdf8" stroke-width="6" fill="none"/><path d="M 60 112 Q 112 170 164 112" stroke="%230284c7" stroke-width="5" fill="none"/><text x="112" y="50" fill="%23e0f2fe" font-size="12" text-anchor="middle" font-family="sans-serif">CT SCAN - NORMAL</text></svg>')}
          >
            <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>🩻 Sample 1: Normal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FF3B30', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8 }}
            onPress={() => setImageUri('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%231a0505"/><circle cx="112" cy="112" r="80" stroke="%23ef4444" stroke-width="6" fill="none"/><line x1="65" y1="80" x2="85" y2="120" stroke="%23f87171" stroke-width="4"/><text x="112" y="50" fill="%23fecdd3" font-size="12" text-anchor="middle" font-family="sans-serif">CT SCAN - LEFT FRACTURE</text></svg>')}
          >
            <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: 'bold' }}>🩻 Sample 2: Left Fracture</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: '#FFF5E6', borderWidth: 1, borderColor: '#FF9500', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8 }}
            onPress={() => setImageUri('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224" viewBox="0 0 224 224"><rect width="224" height="224" fill="%231a1005"/><circle cx="112" cy="112" r="80" stroke="%23f59e0b" stroke-width="6" fill="none"/><line x1="60" y1="85" x2="80" y2="125" stroke="%23fbbf24" stroke-width="4"/><line x1="164" y1="85" x2="144" y2="125" stroke="%23fbbf24" stroke-width="4"/><text x="112" y="50" fill="%23fef3c7" font-size="12" text-anchor="middle" font-family="sans-serif">CT SCAN - BILATERAL FRACTURE</text></svg>')}
          >
            <Text style={{ color: '#FF9500', fontSize: 12, fontWeight: 'bold' }}>🩻 Sample 3: Bilateral</Text>
          </TouchableOpacity>
        </View>

        {/* Live Camera Stream Modal */}
        <Modal
          visible={showWebcamModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeWebcamModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.webcamModalContent}>
              <Text style={styles.webcamTitle}>📷 Live Camera Scan Capture</Text>
              
              <View style={styles.webcamContainer}>
                {cameraError ? (
                  <View style={{ padding: 16, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <Text style={{ color: '#FF3B30', textAlign: 'center', fontWeight: 'bold', marginBottom: 12 }}>⚠️ {cameraError}</Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 }}
                      onPress={() => {
                        closeWebcamModal();
                        pickGalleryImage();
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>📁 Pick Scan File from Device</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  Platform.OS === 'web' ? (
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && webcamStream && el.srcObject !== webcamStream) {
                          el.srcObject = webcamStream;
                          el.play().catch((e) => console.log("video play error:", e));
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 12,
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      }}
                    />
                  ) : null
                )}
              </View>

              <TouchableOpacity
                style={{ marginBottom: 12, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#E6F0FA' }}
                onPress={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              >
                <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>
                  🔄 Switch Camera ({facingMode === 'environment' ? 'Back / Rear' : 'Front / Selfie'})
                </Text>
              </TouchableOpacity>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.snapBtn} onPress={captureWebcamSnapshot}>
                  <Text style={styles.snapBtnText}>📸 SNAP SQUARE CT SCAN</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={closeWebcamModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Text style={styles.uploadBtnText}>☁️ Upload & Analyze Scan</Text>
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
  darkContainer: { backgroundColor: '#0F172A' },
  darkText: { color: '#F8FAFC' },
  darkSubtext: { color: '#94A3B8' },
  scrollStyle: { flex: 1, width: '100%' },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center', paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  imageBox: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', padding: 16 },
  placeholderIcon: { fontSize: 50, marginBottom: 8 },
  placeholderText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  placeholderSub: { color: '#888', fontSize: 13, marginTop: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  chooseBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  galleryBtn: { backgroundColor: '#34C759', marginRight: 0, marginLeft: 8 },
  chooseBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  uploadBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  uploadBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
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
