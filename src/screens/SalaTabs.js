import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useGym } from '../context/GymContext';
import { st, C } from '../styles/neonTheme';
import { KeyboardView, useKeyboardVisible } from '../components/KeyboardView';
import ControlNotificaciones from '../components/ControlNotificaciones';
import ChatTab from './tabs/ChatTab';
import MusicTab from './tabs/MusicTab';
import RutinaTab from './tabs/RutinaTab';
import MetricasTab from './tabs/MetricasTab';

const TABS = [
  { key: 'chat', label: 'CHAT', Comp: ChatTab },
  { key: 'musica', label: 'MÚSICA', Comp: MusicTab },
  { key: 'rutina', label: 'RUTINA', Comp: RutinaTab },
  { key: 'metricas', label: 'MÉTRICAS', Comp: MetricasTab }
];

function MuteBtn({ icono, label, activo, bloqueado, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, marginHorizontal: 4, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1,
        borderColor: activo ? '#ff4d6d' : C.verde,
        backgroundColor: activo ? 'rgba(255,77,109,0.15)' : 'transparent',
        opacity: bloqueado ? 0.5 : 1
      }}
    >
      <Text style={{ fontSize: 16 }}>{icono}</Text>
      <Text style={{ color: activo ? '#ff4d6d' : C.verde, fontSize: 9, fontWeight: '900', marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Volumen({ icono, valor, onChange }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 }}>
      <Text style={{ fontSize: 14 }}>{icono}</Text>
      <Slider
        style={{ flex: 1, height: 30 }}
        minimumValue={0}
        maximumValue={1}
        value={valor}
        onValueChange={onChange}
        minimumTrackTintColor={C.verde}
        maximumTrackTintColor="#333"
        thumbTintColor={C.verde}
      />
      <Text style={{ color: '#888', fontSize: 10, width: 28, textAlign: 'right' }}>{Math.round(valor * 100)}</Text>
    </View>
  );
}

export default function SalaTabs({ navigate }) {
  const {
    sala, participantes, salirSala,
    micMuted, setMicMuted, othersMuted, setOthersMuted, appMuted, setAppMuted,
    micOff, othersOff, volMusica, setVolMusica, volVoz, setVolVoz
  } = useGym();
  const [tab, setTab] = useState('chat');
  const tecladoAbierto = useKeyboardVisible();

  return (
    <KeyboardView style={st.container}>
      <ControlNotificaciones />

      <View style={st.topBar}>
        <TouchableOpacity onPress={() => { salirSala(); navigate('Rooms'); }}>
          <Text style={{ color: C.verde, fontWeight: 'bold' }}>⬅ SALIR</Text>
        </TouchableOpacity>
        <Text style={{ color: '#FFF', fontWeight: '900' }} numberOfLines={1}>{(sala?.nombre || 'SALA').toUpperCase()}</Text>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.verde }} />
      </View>

      {/* Con el teclado abierto se ocultan las barras de audio para dejar espacio al contenido */}
      {!tecladoAbierto && (
        <>
          <View style={st.voiceBanner}>
            <Text style={st.voiceBannerText}>🎙️ CHAT DE VOZ (PRÓXIMAMENTE) · {participantes.length} EN LÍNEA</Text>
          </View>

          <View style={{ backgroundColor: C.panel, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 6 }}>
              <MuteBtn
                icono={micOff ? '🔇' : '🎤'}
                label={micOff ? 'MIC APAGADO' : 'MI MIC'}
                activo={micOff}
                bloqueado={appMuted}
                onPress={() => !appMuted && setMicMuted(!micMuted)}
              />
              <MuteBtn
                icono={othersOff ? '🔇' : '🎧'}
                label={othersOff ? 'OTROS SILENCIADOS' : 'SILENCIAR OTROS'}
                activo={othersOff}
                bloqueado={appMuted}
                onPress={() => !appMuted && setOthersMuted(!othersMuted)}
              />
              <MuteBtn
                icono={appMuted ? '🔇' : '🔊'}
                label={appMuted ? 'ACTIVAR TODO' : 'SILENCIAR TODO'}
                activo={appMuted}
                onPress={() => setAppMuted(!appMuted)}
              />
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 6 }}>
              <Volumen icono="🎵" valor={volMusica} onChange={setVolMusica} />
              <Volumen icono="🗣️" valor={volVoz} onChange={setVolVoz} />
            </View>
          </View>
        </>
      )}

      {/* Todas las pestañas quedan montadas: así la música no se corta al cambiar de pestaña */}
      <View style={{ flex: 1 }}>
        {TABS.map(({ key, Comp }) => (
          <View key={key} style={{ flex: 1, display: tab === key ? 'flex' : 'none' }}>
            <Comp />
          </View>
        ))}
      </View>

      {!tecladoAbierto && (
        <View style={st.tabBar}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity key={key} style={st.tabItem} onPress={() => setTab(key)}>
              <Text style={{ color: tab === key ? C.verde : '#444', fontSize: 11, fontWeight: 'bold' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </KeyboardView>
  );
}
