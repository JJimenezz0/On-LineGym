import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useGym } from '../../context/GymContext';
import { st, C } from '../../styles/neonTheme';
import { ChatImagen, ChatVideo, VisorImagen } from '../../components/ChatMedia';

export default function ChatTab() {
  const { username, participantes, mensajes, enviarMensaje, enviarMedia, sala, micOff } = useGym();
  const [txt, setTxt] = useState('');
  const [subiendo, setSubiendo] = useState(null); // null | 0..1
  const [visor, setVisor] = useState(null);
  const listRef = useRef();

  const enviar = () => {
    if (!txt.trim()) return;
    enviarMensaje(txt);
    setTxt('');
  };

  const adjuntar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.6,
      videoMaxDuration: 60
    });
    if (res.canceled || !res.assets?.length) return;
    setSubiendo(0);
    try {
      await enviarMedia(res.assets[0], setSubiendo);
    } catch (e) {
      Alert.alert(
        'No se pudo enviar',
        res.assets[0].type === 'video'
          ? 'Los videos necesitan Firebase Storage, que no está activado en esta app. Por ahora solo se pueden enviar imágenes.'
          : `No se pudo enviar la imagen. ${e.message || ''}`
      );
    } finally {
      setSubiendo(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={st.avatarRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {participantes.map((n) => (
            <View key={n} style={{ alignItems: 'center' }}>
              <View style={st.avatar}><Text style={st.avatarTxt}>{n.charAt(0).toUpperCase()}</Text></View>
              <Text style={{ color: n === username ? C.verde : '#888', fontSize: 9, marginRight: 10 }} numberOfLines={1}>
                {(n === username ? micOff : sala?.microfonos?.[n]) ? '🔇 ' : ''}{n === username ? 'TÚ' : n}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={{ color: '#444', textAlign: 'center', marginTop: 30 }}>Sin mensajes. ¡Coordina el entrenamiento!</Text>}
        renderItem={({ item }) => (
          <View style={[st.bubble, item.usuario === username ? st.bubbleYo : st.bubbleAmigo]}>
            <Text style={{ color: C.verde, fontSize: 10, fontWeight: 'bold' }}>{item.usuario}</Text>
            {item.tipo === 'imagen' && <View style={{ marginTop: 4 }}><ChatImagen uri={item.url || item.b64} onOpen={setVisor} /></View>}
            {item.tipo === 'video' && item.url && <View style={{ marginTop: 4 }}><ChatVideo url={item.url} /></View>}
            {!!item.texto && <Text style={{ color: '#FFF', marginTop: 2 }}>{item.texto}</Text>}
          </View>
        )}
        contentContainerStyle={{ padding: 15 }}
      />

      {subiendo !== null && (
        <View style={{ backgroundColor: C.panel, paddingHorizontal: 12, paddingTop: 8 }}>
          <Text style={{ color: C.azul, fontSize: 10, fontWeight: 'bold' }}>SUBIENDO… {Math.round(subiendo * 100)}%</Text>
          <View style={{ height: 3, backgroundColor: '#222', marginTop: 4 }}>
            <View style={{ height: 3, width: `${Math.round(subiendo * 100)}%`, backgroundColor: C.verde }} />
          </View>
        </View>
      )}

      <View style={st.inputBar}>
        <TouchableOpacity onPress={adjuntar} disabled={subiendo !== null} style={{ paddingHorizontal: 8, opacity: subiendo !== null ? 0.4 : 1 }}>
          <Text style={{ fontSize: 22 }}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={[st.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#444"
          value={txt}
          onChangeText={setTxt}
          onSubmitEditing={enviar}
        />
        <TouchableOpacity style={st.sendBtn} onPress={enviar}>
          <Text style={{ color: C.oscuro, fontWeight: '900', fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>

      <VisorImagen uri={visor} onClose={() => setVisor(null)} />
    </View>
  );
}
