import React from 'react';
import { GymProvider } from './src/context/GymContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GymProvider>
      <AppNavigator />
    </GymProvider>
  );
}
