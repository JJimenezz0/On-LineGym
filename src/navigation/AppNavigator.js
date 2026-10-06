import React, { useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler, StatusBar } from 'react-native';
import { useGym } from '../context/GymContext';

import LoginScreen from '../screens/LoginScreen';
import RoomsScreen from '../screens/RoomsScreen';
import SalaTabs from '../screens/SalaTabs';

export default function AppNavigator() {
  const { activeSalaId, salirSala } = useGym();
  const [currentScreen, setCurrentScreen] = useState('Login'); // 'Login' | 'Rooms' | 'SalaTabs'

  // Botón "atrás" de Android: sala -> salas -> login
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'SalaTabs') { salirSala(); setCurrentScreen('Rooms'); return true; }
      if (currentScreen === 'Rooms') { setCurrentScreen('Login'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentScreen]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#141419" />
      {currentScreen === 'Login' && <LoginScreen navigate={setCurrentScreen} />}
      {currentScreen === 'Rooms' && <RoomsScreen navigate={setCurrentScreen} />}
      {currentScreen === 'SalaTabs' && activeSalaId && <SalaTabs navigate={setCurrentScreen} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0C' }
});
