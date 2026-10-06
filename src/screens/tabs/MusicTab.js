import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useGym } from '../../context/GymContext';
import { st, C } from '../../styles/neonTheme';
import MusicPlayer from '../../components/MusicPlayer';
import PlaylistsPanel from '../../components/PlaylistsPanel';
import { youtubeId, spotifyInfo, tipoLink } from '../../utils/helpers';
import { useTitulos } from '../../utils/useTitulos';

export default function MusicTab() {
  const {
    colaMusica, musicaEstado, trackActual,
    agregarTrack, alternarPlayPausa, siguiente, anterior, irATrack, finDeCancion, quitarTrack,
    musicOff, volMusica
  } = useGym();
  const [vista, setVista] = useState('cola'); // 'cola' | 'playlists'
  const [link, setLink] = useState('');
  const titulos = useTitulos(colaMusica.map((t) => t.link));

  const agregar = async () => {
    if (!link.trim()) return;
    const ok = await agregarTrack(link);
    if (!ok) {
      return Alert.alert(
        'Link no válido',
        'Pega un enlace completo de YouTube o de open.spotify.com (los links cortos spotify.link no funcionan).'
      );
    }
    setLink('');
  };

  const confirmarQuitar = (t, i) =>
    Alert.alert('Quitar de la cola', '¿Quitar esta canción para todos en la sala?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => quitarTrack(t, i) }
    ]);

  const tipo = tipoLink(trackActual?.link);
  const nombre = trackActual ? titulos[trackActual.link] || trackActual.link : 'Ninguna';

  const Pestana = ({ k, label }) => (
    <TouchableOpacity
      onPress={() => setVista(k)}
      style={{
        flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2,
        borderBottomColor: vista === k ? C.verde : '#222'
      }}
    >
      <Text style={{ color: vista === k ? C.verde : '#555', fontWeight: '900', fontSize: 11 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={st.musicBox}>
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 }}>SONANDO AHORA</Text>
        <Text style={{ color: C.verde, marginVertical: 6 }} numberOfLines={2}>{nombre}</Text>
        {trackActual && <Text style={{ color: '#555', fontSize: 11 }}>Añadida por {trackActual.usuario}</Text>}

        <View style={st.ctrlRow}>
          <TouchableOpacity style={st.ctrlBtn} onPress={anterior}><Text style={{ color: C.azul, fontSize: 20 }}>⏮</Text></TouchableOpacity>
          <TouchableOpacity style={st.playBtn} onPress={alternarPlayPausa}>
            <Text style={{ color: C.oscuro, fontSize: 26 }}>{musicaEstado.reproduciendo ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={siguiente}><Text style={{ color: C.azul, fontSize: 20 }}>⏭</Text></TouchableOpacity>
        </View>
      </View>

      {tipo && (
        <MusicPlayer
          tipo={tipo}
          ytId={tipo === 'youtube' ? youtubeId(trackActual.link) : null}
          spotify={tipo === 'spotify' ? spotifyInfo(trackActual.link) : null}
          url={trackActual.link}
          reproduciendo={musicaEstado.reproduciendo}
          silenciado={musicOff}
          volumen={volMusica}
          onEnded={() => finDeCancion(musicaEstado.indice)}
        />
      )}

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <Pestana k="cola" label="COLA" />
        <Pestana k="playlists" label="PLAYLISTS" />
      </View>

      {vista === 'cola' ? (
        <>
          <Text style={st.sectionTitle}>AÑADIR LINK</Text>
          <TextInput
            style={st.input}
            placeholder="Pegar link de YouTube / Spotify..."
            placeholderTextColor="#444"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={agregar}
          />
          <TouchableOpacity style={st.neonBtn} onPress={agregar}><Text style={st.neonBtnTxt}>AGREGAR A LA COLA</Text></TouchableOpacity>

          <Text style={[st.sectionTitle, { marginTop: 20 }]}>COLA DE REPRODUCCIÓN ({colaMusica.length})</Text>
          {colaMusica.map((t, i) => {
            const activa = i === musicaEstado.indice;
            return (
              <View key={t.id} style={[st.smallCard, activa && { borderWidth: 1, borderColor: C.verde }]}>
                <TouchableOpacity style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }} onPress={() => irATrack(i)}>
                  <Text style={{ color: activa ? C.verde : '#FFF', width: 24 }}>{activa ? '▶' : i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF' }} numberOfLines={1}>{titulos[t.link] || t.link}</Text>
                    <Text style={{ color: '#555', fontSize: 11 }}>por {t.usuario} · {tipoLink(t.link) === 'spotify' ? 'Spotify' : 'YouTube'}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmarQuitar(t, i)} style={{ padding: 8 }}>
                  <Text style={{ color: '#ff4d6d', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      ) : (
        <PlaylistsPanel />
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
