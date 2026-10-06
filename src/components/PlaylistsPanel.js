import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useGym } from '../context/GymContext';
import { st, C } from '../styles/neonTheme';
import { tipoLink } from '../utils/helpers';
import { useTitulos } from '../utils/useTitulos';

// Playlists de la sala: colecciones de canciones que se pueden cargar a la cola cuando quieras.
export default function PlaylistsPanel() {
  const {
    playlists, crearPlaylist, eliminarPlaylist, agregarAPlaylist, quitarDePlaylist,
    escucharCancionesPlaylist, reproducirPlaylist
  } = useGym();
  const [abierta, setAbierta] = useState(null); // id de la playlist abierta
  const [nombre, setNombre] = useState('');
  const [link, setLink] = useState('');
  const [canciones, setCanciones] = useState([]);

  const pl = playlists.find((p) => p.id === abierta) || null;
  const titulos = useTitulos(canciones.map((c) => c.link));

  useEffect(() => {
    setCanciones([]);
    if (!abierta) return;
    return escucharCancionesPlaylist(abierta, setCanciones);
  }, [abierta]);

  // Si alguien borra la playlist abierta, se vuelve a la lista
  useEffect(() => { if (abierta && !pl) setAbierta(null); }, [pl, abierta]);

  const crear = async () => {
    if (!nombre.trim()) return;
    await crearPlaylist(nombre);
    setNombre('');
  };

  const confirmarBorrar = (p) =>
    Alert.alert('Eliminar playlist', `¿Eliminar "${p.nombre}" y todas sus canciones?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarPlaylist(p) }
    ]);

  const agregar = async () => {
    if (!link.trim()) return;
    const ok = await agregarAPlaylist(abierta, link);
    if (!ok) return Alert.alert('Link no válido', 'Pega un enlace completo de YouTube o de open.spotify.com.');
    setLink('');
  };

  const reproducir = (reemplazar) => {
    if (!canciones.length) return Alert.alert('Playlist vacía', 'Añade canciones primero.');
    reproducirPlaylist(canciones, reemplazar);
    Alert.alert(reemplazar ? 'Reproduciendo' : 'Añadida a la cola', reemplazar ? 'La cola ahora es esta playlist.' : 'Las canciones se añadieron al final de la cola.');
  };

  // ----- Dentro de una playlist -----
  if (pl) {
    return (
      <View>
        <TouchableOpacity onPress={() => setAbierta(null)} style={{ marginBottom: 10 }}>
          <Text style={{ color: C.verde, fontWeight: 'bold' }}>‹ TODAS LAS PLAYLISTS</Text>
        </TouchableOpacity>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>{pl.nombre}</Text>
        <Text style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>Creada por {pl.creador} · {canciones.length} canciones</Text>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={[st.neonBtn, { flex: 1, marginTop: 0, marginRight: 6, padding: 12 }]} onPress={() => reproducir(true)}>
            <Text style={[st.neonBtnTxt, { fontSize: 11 }]}>▶ REPRODUCIR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.neonBtnAlt, { flex: 1, marginTop: 0, marginLeft: 6, padding: 12 }]} onPress={() => reproducir(false)}>
            <Text style={[st.neonBtnTxt, { fontSize: 11 }]}>＋ A LA COLA</Text>
          </TouchableOpacity>
        </View>

        <Text style={[st.sectionTitle, { marginTop: 18 }]}>AÑADIR CANCIÓN A ESTA PLAYLIST</Text>
        <TextInput
          style={st.input} placeholder="Pegar link de YouTube / Spotify..." placeholderTextColor="#444"
          value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} onSubmitEditing={agregar}
        />
        <TouchableOpacity style={st.neonBtn} onPress={agregar}><Text style={st.neonBtnTxt}>AÑADIR</Text></TouchableOpacity>

        <Text style={[st.sectionTitle, { marginTop: 20 }]}>CANCIONES</Text>
        {canciones.length === 0 && <Text style={{ color: '#555', fontSize: 12 }}>Aún no hay canciones.</Text>}
        {canciones.map((c, i) => (
          <View key={c.id} style={st.smallCard}>
            <Text style={{ color: '#888', width: 24 }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF' }} numberOfLines={1}>{titulos[c.link] || c.link}</Text>
              <Text style={{ color: '#555', fontSize: 11 }}>por {c.usuario} · {tipoLink(c.link) === 'spotify' ? 'Spotify' : 'YouTube'}</Text>
            </View>
            <TouchableOpacity onPress={() => quitarDePlaylist(abierta, c.id)} style={{ padding: 8 }}>
              <Text style={{ color: '#ff4d6d', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  // ----- Lista de playlists -----
  return (
    <View>
      <Text style={st.sectionTitle}>NUEVA PLAYLIST</Text>
      <TextInput
        style={st.input} placeholder="Nombre (ej: Pierna pesada)" placeholderTextColor="#444"
        value={nombre} onChangeText={setNombre} onSubmitEditing={crear}
      />
      <TouchableOpacity style={st.neonBtn} onPress={crear}><Text style={st.neonBtnTxt}>CREAR PLAYLIST</Text></TouchableOpacity>

      <Text style={[st.sectionTitle, { marginTop: 20 }]}>PLAYLISTS DE LA SALA ({playlists.length})</Text>
      {playlists.length === 0 && <Text style={{ color: '#555', fontSize: 12 }}>Crea la primera para empezar tu colección.</Text>}
      {playlists.map((p) => (
        <View key={p.id} style={st.smallCard}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setAbierta(p.id)}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>📁 {p.nombre}</Text>
            <Text style={{ color: '#555', fontSize: 11 }}>por {p.creador} · toca para abrir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmarBorrar(p)} style={{ padding: 8 }}>
            <Text style={{ color: '#ff4d6d', fontSize: 16 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
