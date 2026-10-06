import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useGym } from '../context/GymContext';
import { st, C } from '../styles/neonTheme';
import { KeyboardView } from '../components/KeyboardView';
import { USUARIO_REGEX } from '../utils/helpers';

const mensajeError = (e) => {
  switch (e?.code) {
    case 'auth/email-already-in-use': return 'Ese nombre de usuario ya existe. Elige otro o inicia sesión.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Usuario o contraseña incorrectos.';
    case 'auth/weak-password': return 'La contraseña es muy débil: usa al menos 6 caracteres.';
    case 'auth/network-request-failed': return 'Sin conexión. Revisa tu internet.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Espera un momento y vuelve a probar.';
    case 'auth/operation-not-allowed':
      return 'Falta activar "Correo electrónico/contraseña" en Firebase → Authentication → Método de acceso.';
    default: return `No se pudo completar la acción (${e?.code || e?.message || 'error'}).`;
  }
};

// La navegación a las salas la hace AppNavigator en cuanto Firebase confirma la sesión.
export default function LoginScreen() {
  const { iniciarSesion, registrar } = useGym();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [ver, setVer] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    const u = user.trim();
    if (!USUARIO_REGEX.test(u)) {
      return Alert.alert('Usuario no válido', 'Usa de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).');
    }
    if (pass.length < 6) return Alert.alert('Contraseña corta', 'Debe tener al menos 6 caracteres.');
    if (modo === 'registro' && pass !== pass2) return Alert.alert('No coinciden', 'Las dos contraseñas deben ser iguales.');
    setCargando(true);
    try {
      if (modo === 'login') await iniciarSesion(u, pass);
      else await registrar(u, pass);
    } catch (e) {
      Alert.alert('Error', mensajeError(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardView>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 30 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={st.mainLogo}>On-Line<Text style={{ color: C.verde }}>Gym</Text></Text>
          <Text style={st.subLogo}>Sincronización Cyberpunk de Entrenamiento</Text>
        </View>

        <View style={{ width: '100%', marginTop: 40 }}>
          <Text style={st.label}>NOMBRE DE USUARIO</Text>
          <TextInput
            style={st.input} placeholder="Ej: IronLifter" placeholderTextColor="#444"
            value={user} onChangeText={setUser} autoCapitalize="none" autoCorrect={false}
          />
          <Text style={st.label}>CONTRASEÑA</Text>
          <View>
            <TextInput
              style={st.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#444"
              secureTextEntry={!ver} value={pass} onChangeText={setPass} autoCapitalize="none"
              onSubmitEditing={modo === 'login' ? enviar : undefined}
            />
            <TouchableOpacity onPress={() => setVer(!ver)} style={{ position: 'absolute', right: 14, top: 14 }}>
              <Text style={{ color: C.azul, fontSize: 11, fontWeight: 'bold' }}>{ver ? 'OCULTAR' : 'VER'}</Text>
            </TouchableOpacity>
          </View>
          {modo === 'registro' && (
            <>
              <Text style={st.label}>REPETIR CONTRASEÑA</Text>
              <TextInput
                style={st.input} placeholder="Repite la contraseña" placeholderTextColor="#444"
                secureTextEntry={!ver} value={pass2} onChangeText={setPass2} autoCapitalize="none"
                onSubmitEditing={enviar}
              />
            </>
          )}

          <TouchableOpacity style={[st.neonBtn, cargando && { opacity: 0.6 }]} onPress={enviar} disabled={cargando}>
            {cargando
              ? <ActivityIndicator color={C.oscuro} />
              : <Text style={st.neonBtnTxt}>{modo === 'login' ? 'INGRESAR' : 'CREAR CUENTA'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setModo(modo === 'login' ? 'registro' : 'login'); setPass2(''); }} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: C.azul, fontSize: 12 }}>
              {modo === 'login' ? '¿Primera vez? CREA TU CUENTA' : '¿Ya tienes cuenta? INICIA SESIÓN'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardView>
  );
}
