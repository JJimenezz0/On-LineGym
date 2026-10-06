import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, Switch, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { db } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, updateDoc, doc } from 'firebase/firestore';
import { useGym } from '../context/GymContext';
import { st, C } from '../styles/neonTheme';
import { KeyboardView } from '../components/KeyboardView';
import { distanciaMetros, RADIO_METROS } from '../utils/helpers';

const hash = (txt) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, txt);

export default function RoomsScreen({ navigate }) {
  const { username, entrarSala, cerrarSesion } = useGym();
  const [salas, setSalas] = useState([]);
  const [pos, setPos] = useState(null);
  const [permiso, setPermiso] = useState('pendiente'); // pendiente | ok | denegado
  const [modalCrear, setModalCrear] = useState(false);
  const [modalPass, setModalPass] = useState(false);
  const [selectedSala, setSelectedSala] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [inputPassword, setInputPassword] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'salas')), (snap) =>
      setSalas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const ubicar = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setPermiso('denegado'); return; }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      setPermiso('ok');
    } catch (e) {
      setPermiso('denegado');
    }
  };
  useEffect(() => { ubicar(); }, []);

  const esMia = (s) => s.creador === username;
  const esMiembro = (s) => esMia(s) || (s.miembros || []).includes(username);

  // Se ven: las cercanas, y SIEMPRE las que ya has creado o a las que has entrado (aunque estés lejos).
  const visibles = useMemo(() => {
    return salas
      .map((s) => ({
        ...s,
        dist: pos && s.lat != null ? distanciaMetros(pos, { lat: s.lat, lng: s.lng }) : null
      }))
      .filter((s) => esMiembro(s) || permiso !== 'ok' || s.dist == null || s.dist <= RADIO_METROS)
      .sort((a, b) => (esMiembro(b) ? 1 : 0) - (esMiembro(a) ? 1 : 0) || (b.activa ? 1 : 0) - (a.activa ? 1 : 0));
  }, [salas, pos, permiso, username]);

  const crearSala = async () => {
    if (!roomName.trim() || !roomPassword.trim()) return Alert.alert('Error', 'Campos incompletos');
    try {
      await addDoc(collection(db, 'salas'), {
        nombre: roomName.trim(),
        passHash: await hash(roomPassword),
        creador: username,
        miembros: [username],
        activa: true,
        lat: pos ? pos.lat : null,
        lng: pos ? pos.lng : null,
        creadoEn: Date.now(),
        presencia: {},
        musicaEstado: { indice: -1, reproduciendo: false }
      });
      setModalCrear(false); setRoomName(''); setRoomPassword('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear la sala. Revisa tu conexión y las reglas de Firestore.');
    }
  };

  const entrar = (sala) => {
    entrarSala(sala);
    navigate('SalaTabs');
  };

  const pulsarEntrar = (item) => {
    if (!item.activa) return Alert.alert('Sala inactiva', 'El creador debe activarla para poder entrar.');
    if (esMiembro(item)) return entrar(item); // el dueño y quien ya entró no necesitan la clave otra vez
    setSelectedSala(item);
    setModalPass(true);
  };

  const comprobarPass = async () => {
    const h = await hash(inputPassword);
    const ok = selectedSala.passHash ? h === selectedSala.passHash : inputPassword === selectedSala.password;
    if (ok) {
      setModalPass(false); setInputPassword('');
      entrar(selectedSala);
    } else {
      Alert.alert('Error', 'Clave incorrecta');
    }
  };

  const confirmarSalir = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: cerrarSesion }
    ]);

  const avisoUbicacion =
    permiso === 'ok' ? `Cerca de ti (${RADIO_METROS} m) + tus salas`
    : permiso === 'denegado' ? 'Sin permiso de ubicación: se muestran todas las salas'
    : 'Buscando tu ubicación...';

  return (
    <View style={{ flex: 1, padding: 20, paddingTop: 50, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={st.headerTitle}>SALAS <Text style={{ color: C.verde }}>CERCANAS</Text></Text>
        <TouchableOpacity onPress={confirmarSalir}><Text style={{ color: '#ff4d6d', fontSize: 11, fontWeight: 'bold' }}>CERRAR SESIÓN</Text></TouchableOpacity>
      </View>
      <Text style={{ color: '#666', marginTop: 4 }}>Usuario activo: {username}</Text>
      <TouchableOpacity onPress={ubicar}>
        <Text style={{ color: C.azul, fontSize: 11, marginVertical: 10 }}>📡 {avisoUbicacion}  ·  TOCA PARA ACTUALIZAR</Text>
      </TouchableOpacity>

      <FlatList
        data={visibles}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={{ color: '#555', textAlign: 'center', marginTop: 40 }}>No hay salas cerca. Crea una con el botón +</Text>}
        renderItem={({ item }) => {
          const lejos = item.dist != null && item.dist > RADIO_METROS;
          return (
            <View style={[st.card, !item.activa && st.cardLocked]}>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>{!item.activa ? '🔒 ' : ''}{item.nombre}</Text>
                <Text style={{ color: '#555', fontSize: 12 }}>
                  Por: {item.creador}
                  {item.dist != null ? `  ·  ${item.dist < 1000 ? Math.round(item.dist) + ' m' : (item.dist / 1000).toFixed(1) + ' km'}` : ''}
                  {esMiembro(item) && !esMia(item) ? '  ·  📌 UNIDA' : ''}
                  {lejos ? '  ·  A DISTANCIA' : ''}
                  {!item.activa ? '  ·  INACTIVA' : ''}
                </Text>
              </View>
              {esMia(item) && (
                <Switch
                  value={!!item.activa}
                  onValueChange={() => updateDoc(doc(db, 'salas', item.id), { activa: !item.activa })}
                  trackColor={{ false: '#222', true: C.verde }}
                  style={{ marginRight: 8 }}
                />
              )}
              <TouchableOpacity style={item.activa ? st.miniBtn : st.miniBtnOff} onPress={() => pulsarEntrar(item)}>
                <Text style={{ color: item.activa ? C.oscuro : '#777', fontWeight: '900', fontSize: 11 }}>ENTRAR</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      <TouchableOpacity style={st.fab} onPress={() => setModalCrear(true)}>
        <Text style={{ fontSize: 28, color: C.oscuro, fontWeight: '900' }}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalCrear} animationType="slide" transparent onRequestClose={() => setModalCrear(false)}>
        <KeyboardView style={st.overlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitle}>NUEVA SALA PERSISTENTE</Text>
            <TextInput style={st.input} placeholder="Nombre de la sala" placeholderTextColor="#444" value={roomName} onChangeText={setRoomName} />
            <TextInput style={st.input} placeholder="Contraseña de acceso" placeholderTextColor="#444" secureTextEntry value={roomPassword} onChangeText={setRoomPassword} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={{ padding: 10 }} onPress={() => setModalCrear(false)}><Text style={{ color: '#FFF' }}>CERRAR</Text></TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={crearSala}><Text style={{ color: C.oscuro, fontWeight: '900' }}>CREAR</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardView>
      </Modal>

      <Modal visible={modalPass} animationType="fade" transparent onRequestClose={() => setModalPass(false)}>
        <KeyboardView style={st.overlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitle}>SALA PROTEGIDA 🔒</Text>
            <TextInput style={st.input} placeholder="Ingresa contraseña" placeholderTextColor="#444" secureTextEntry value={inputPassword} onChangeText={setInputPassword} onSubmitEditing={comprobarPass} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={{ padding: 10 }} onPress={() => { setModalPass(false); setInputPassword(''); }}><Text style={{ color: '#FFF' }}>ATRÁS</Text></TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={comprobarPass}><Text style={{ color: C.oscuro, fontWeight: '900' }}>ACCEDER</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardView>
      </Modal>
    </View>
  );
}
