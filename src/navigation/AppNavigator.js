import React, { useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler, StatusBar, ActivityIndicator } from 'react-native';
import { useGym } from '../context/GymContext';

import LoginScreen from '../screens/LoginScreen';
import RoomsScreen from '../screens/RoomsScreen';
import SalaTabs from '../screens/SalaTabs';

export default function AppNavigator() {
  const { authListo, username, activeSalaId, salirSala } = useGym();
  const [currentScreen, setCurrentScreen] = useState('Login'); // 'Login' | 'Rooms' | 'SalaTabs'

  // La sesión manda: con sesión iniciada se va a las salas, sin sesión al login.
  useEffect(() => {
    if (!authListo) return;
    if (username && currentScreen === 'Login') setCurrentScreen('Rooms');
    if (!username && currentScreen !== 'Login') setCurrentScreen('Login');
  }, [authListo, username]);

  // Botón "atrás" de Android: sala -> salas. En el resto, el sistema cierra la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'SalaTabs') { salirSala(); setCurrentScreen('Rooms'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentScreen]);

  if (!authListo) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#00FFCC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#141419" />
      {currentScreen === 'Login' && <LoginScreen />}
      {currentScreen === 'Rooms' && <RoomsScreen navigate={setCurrentScreen} />}
      {currentScreen === 'SalaTabs' && activeSalaId && <SalaTabs navigate={setCurrentScreen} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0C' }
});
