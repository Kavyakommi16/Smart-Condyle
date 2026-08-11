import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { getSession } from '../services/authService';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const activeUser = await getSession();
      if (activeUser) {
        navigation.replace('Dashboard', { user: activeUser });
      } else {
        navigation.replace('Login');
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [navigation]);

  const handleContinue = async () => {
    const activeUser = await getSession();
    if (activeUser) {
      navigation.replace('Dashboard', { user: activeUser });
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
        </View>

        <Text style={styles.title}>Smart Condyle</Text>
        <Text style={styles.subtitle}>AI-Based Condyle Fracture Detection</Text>

        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 30 }} />

        <TouchableOpacity style={styles.skipBtn} onPress={handleContinue}>
          <Text style={styles.skipText}>Tap to Continue ➔</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  skipBtn: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  skipText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
