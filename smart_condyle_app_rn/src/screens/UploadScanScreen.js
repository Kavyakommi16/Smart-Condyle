import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, ScrollView, Alert, Modal, Platform, TextInput, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { subscribeDarkMode, getPatients } from '../services/storageService';

export default function UploadScanScreen({ route, navigation }) {
  const [currentPatient, setCurrentPatient] = useState(route.params?.patient || null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [imageUris, setImageUris] = useState([]);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState('');
  const [isDark, setIsDark] = useState(false);
  const videoRef = useRef(null);

  const handleOpenPatientSearch = async () => {
    const pts = await getPatients();
    setPatientsList(pts);
    setSearchQuery('');
    setShowPatientModal(true);
  };

  const filteredPatients = patientsList.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (p.patientId && p.patientId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectPatient = (selected) => {
    setCurrentPatient(selected);
    setShowPatientModal(false);
  };

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
          setImageUris((prev) => [...prev, result.assets[0].uri]);
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
      setImageUris((prev) => [...prev, dataUrl]);
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
        allowsMultipleSelection: true,
        quality: 0.5, 
        base64: true, 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(asset => {
          if (asset.base64) {
            return `data:image/jpeg;base64,${asset.base64}`;
          }
          return asset.uri;
        });
        setImageUris((prev) => [...prev, ...newUris]);
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (event) => {
          const files = Array.from(event.target.files);
          files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
              setImageUris((prev) => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
          });
        };
        input.click();
      } else {
        Alert.alert("Error", "Could not pick image");
      }
    }
  };

  const handleUpload = () => {
    if (imageUris.length === 0) {
      Alert.alert("No Images Selected", "Please select or capture at least one CT scan image.");
      return;
    }
    if (!currentPatient) {
      Alert.alert("No Patient Selected", "Please select a patient before uploading.");
      return;
    }

    navigation.navigate('Analysis', {
      imageUris,
      patient: currentPatient,
    });
  };

  const removeImage = (index) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView
        style={styles.scrollStyle}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.title, isDark && styles.darkText]}>Upload Jaw CT Scans</Text>
        <Text style={[styles.subtitle, isDark && styles.darkSubtext]}>Upload multiple CT/X-ray scans for AI Analysis</Text>

        {/* Selected Patient Card */}
        <View style={[styles.patientCard, isDark && styles.darkPatientCard]}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientLabel}>Target Patient:</Text>
            <Text style={[styles.patientName, isDark && styles.darkText]}>
              {currentPatient ? `${currentPatient.name} (${currentPatient.patientId || 'No ID'})` : 'No Patient Selected'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePatientBtn} onPress={handleOpenPatientSearch}>
            <Text style={styles.changePatientBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Image List */}
        <View style={styles.imageGalleryContainer}>
          {imageUris.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {imageUris.map((uri, index) => (
                <View key={index} style={styles.imageBox}>
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addMoreBtn} onPress={pickGalleryImage}>
                <Text style={styles.addMoreIcon}>+</Text>
                <Text style={styles.addMoreText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholder}>
                <Text style={styles.placeholderIcon}>🩻</Text>
                <Text style={styles.placeholderText}>No Scans Selected</Text>
                <Text style={styles.placeholderSub}>Add one or more CT scans</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.chooseBtn, styles.galleryBtn]} onPress={pickGalleryImage}>
            <Text style={styles.chooseBtnText}>🖼️ Choose Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chooseBtn, styles.cameraBtn]} onPress={takeCameraPhoto}>
            <Text style={styles.chooseBtnText}>📸 Take Photo</Text>
          </TouchableOpacity>
        </View>



        {/* Live Camera Stream Modal Removed */}

        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Text style={styles.uploadBtnText}>☁️ Upload & Analyze Scan</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Patient Search Modal */}
      <Modal visible={showPatientModal} transparent={true} animationType="slide" onRequestClose={() => setShowPatientModal(false)}>
        <View style={styles.patientModalOverlay}>
          <View style={[styles.patientModalContent, isDark && styles.darkPatientModalContent]}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>Select Patient</Text>
            <TextInput
              style={[styles.searchInput, isDark && styles.darkSearchInput]}
              placeholder="Search by name or ID..."
              placeholderTextColor={isDark ? '#94A3B8' : '#888'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredPatients}
              keyExtractor={(item, index) => item.patientId || String(index)}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.patientListItem, isDark && styles.darkPatientListItem]} onPress={() => selectPatient(item)}>
                  <Text style={[styles.patientListName, isDark && styles.darkText]}>{item.name}</Text>
                  <Text style={[styles.patientListId, isDark && styles.darkSubtext]}>{item.patientId}</Text>
                </TouchableOpacity>
              )}
              style={styles.patientList}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowPatientModal(false)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  patientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkPatientCard: { backgroundColor: '#1E293B', borderColor: '#334155' },
  patientInfo: { flex: 1 },
  patientLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  changePatientBtn: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  changePatientBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  imageGalleryContainer: {
    height: 200,
    marginBottom: 20,
    justifyContent: 'center',
  },
  hScroll: {
    paddingVertical: 10,
  },
  placeholderContainer: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  imageBox: {
    width: 160,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#000',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  image: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addMoreBtn: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginRight: 12,
  },
  addMoreIcon: {
    fontSize: 40,
    color: '#94A3B8',
  },
  addMoreText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  placeholder: { alignItems: 'center', padding: 16 },
  placeholderIcon: { fontSize: 50, marginBottom: 8 },
  placeholderText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  placeholderSub: { color: '#888', fontSize: 13, marginTop: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  chooseBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  galleryBtn: { backgroundColor: '#34C759' },
  cameraBtn: { backgroundColor: '#007AFF' },
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
  patientModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  patientModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '70%',
  },
  darkPatientModalContent: { backgroundColor: '#0F172A' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1A1A1A' },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#0F172A',
  },
  darkSearchInput: { backgroundColor: '#1E293B', color: '#F8FAFC' },
  patientList: { flex: 1 },
  patientListItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  darkPatientListItem: { borderBottomColor: '#334155' },
  patientListName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  patientListId: { fontSize: 14, color: '#64748B', marginTop: 4 },
  closeModalBtn: {
    backgroundColor: '#EF4444',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
