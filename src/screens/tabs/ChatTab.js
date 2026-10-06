import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useGym } from '../../context/GymContext';
import { st } from '../../styles/neonTheme';

export default function ChatTab() {
  const { username, participantes, mensajes, enviarMensaje, sala, micOff } = useGym();
  const [txt, setTxt] = useState('');
  const listRef = useRef();

  const enviar = () => {
    if (!txt.trim()) return;
    enviarMensaje(txt);
    setTxt('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={st.avatarRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {participantes.map((n) => (
            <View key={n} style={{ alignItems: 'center' }}>
              <View style={st.avatar}><Text style={st.avatarTxt}>{n.charAt(0).toUpperCase()}</Text></View>
              <Text style={{ color: n === username ? '#00FFCC' : '#888', fontSize: 9, marginRight: 10 }} numberOfLines={1}>
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
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={{ color: '#444', textAlign: 'center', marginTop: 30 }}>Sin mensajes. ¡Coordina el entrenamiento!</Text>}
        renderItem={({ item }) => (
          <View style={[st.bubble, item.usuario === username ? st.bubbleYo : st.bubbleAmigo]}>
            <Text style={{ color: '#00FFCC', fontSize: 10, fontWeight: 'bold' }}>{item.usuario}</Text>
            <Text style={{ color: '#FFF', marginTop: 2 }}>{item.texto}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 15 }}
      />

      <View style={st.inputBar}>
        <TextInput
          style={[st.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#444"
          value={txt}
          onChangeText={setTxt}
          onSubmitEditing={enviar}
        />
        <TouchableOpacity style={st.sendBtn} onPress={enviar}>
          <Text style={{ color: '#121212', fontWeight: '900', fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
