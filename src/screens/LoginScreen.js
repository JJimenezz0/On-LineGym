import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useGym } from '../context/GymContext';
import { st } from '../styles/neonTheme';

export default function LoginScreen({ navigate }) {
  const { setUsername } = useGym();
  const [localUser, setLocalUser] = useState('');

  const handleIngresar = () => {
    if (!localUser.trim()) return Alert.alert('Error', 'Ingresa tu nombre de usuario');
    setUsername(localUser.trim());
    navigate('Rooms');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.centerView}>
      <Text style={st.mainLogo}>On-Line<Text style={{ color: '#00FFCC' }}>Gym</Text></Text>
      <Text style={st.subLogo}>Sincronización Cyberpunk de Entrenamiento</Text>
      <View style={{ width: '100%', marginTop: 40 }}>
        <Text style={st.label}>NOMBRE DE USUARIO</Text>
        <TextInput
          style={st.input}
          placeholder="Ej: IronLifter"
          placeholderTextColor="#444"
          value={localUser}
          onChangeText={setLocalUser}
          autoCapitalize="none"
          onSubmitEditing={handleIngresar}
        />
        <TouchableOpacity style={st.neonBtn} onPress={handleIngresar}>
          <Text style={st.neonBtnTxt}>INGRESAR</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
