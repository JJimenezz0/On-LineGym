import React from 'react';
import { View, Text, Image, Modal, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

export function ChatVideo({ url }) {
  const player = useVideoPlayer(url);
  return (
    <VideoView
      player={player}
      style={{ width: 220, height: 160, borderRadius: 8, backgroundColor: '#000' }}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
    />
  );
}

export function ChatImagen({ uri, onOpen }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onOpen(uri)}>
      <Image source={{ uri }} style={{ width: 220, height: 160, borderRadius: 8, backgroundColor: '#000' }} resizeMode="cover" />
    </TouchableOpacity>
  );
}

// Pantalla completa para ver una imagen
export function VisorImagen({ uri, onClose }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
        {uri && <Image source={{ uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 45, right: 20, padding: 10 }}>
          <Text style={{ color: '#00FFCC', fontSize: 22, fontWeight: '900' }}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
