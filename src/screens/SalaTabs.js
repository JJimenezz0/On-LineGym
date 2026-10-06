import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useGym } from '../context/GymContext';
import { st, C } from '../styles/neonTheme';
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

export default function SalaTabs({ navigate }) {
  const {
    sala, participantes, salirSala,
    micMuted, setMicMuted, othersMuted, setOthersMuted, appMuted, setAppMuted,
    micOff, othersOff
  } = useGym();
  const [tab, setTab] = useState('chat');

  return (
    <View style={st.container}>
      <View style={st.topBar}>
        <TouchableOpacity onPress={() => { salirSala(); navigate('Rooms'); }}>
          <Text style={{ color: C.verde, fontWeight: 'bold' }}>⬅ SALIR</Text>
        </TouchableOpacity>
        <Text style={{ color: '#FFF', fontWeight: '900' }} numberOfLines={1}>{(sala?.nombre || 'SALA').toUpperCase()}</Text>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.verde }} />
      </View>
      <View style={st.voiceBanner}>
        <Text style={st.voiceBannerText}>🎙️ CANAL DE VOZ POR PROXIMIDAD ({participantes.length} EN LÍNEA)</Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: C.panel, paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
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

      {/* Todas las pestañas quedan montadas: así la música no se corta al cambiar de pestaña */}
      <View style={{ flex: 1 }}>
        {TABS.map(({ key, Comp }) => (
          <View key={key} style={{ flex: 1, display: tab === key ? 'flex' : 'none' }}>
            <Comp />
          </View>
        ))}
      </View>

      <View style={st.tabBar}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity key={key} style={st.tabItem} onPress={() => setTab(key)}>
            <Text style={{ color: tab === key ? C.verde : '#444', fontSize: 11, fontWeight: 'bold' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
