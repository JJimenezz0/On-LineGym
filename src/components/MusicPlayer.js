import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

// Reproduce YouTube y Spotify DENTRO de la app (WebView con el reproductor incrustado).
// El estado (play/pausa y pista) viene de Firestore, así que todos los teléfonos reciben el mismo comando.
const ORIGIN = 'https://onlinegym.app'; // origen neutro: YouTube rechaza incrustar desde su propio dominio

const ytHtml = (id) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}#p{width:100%;height:100%}</style></head>
<body><div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player;
function post(m){ window.ReactNativeWebView.postMessage(m); }
function onYouTubeIframeAPIReady(){
  player = new YT.Player('p', {
    videoId: '${id}',
    playerVars: { playsinline: 1, controls: 1, rel: 0, origin: '${ORIGIN}' },
    events: {
      onReady: function(){ post('ready'); },
      onStateChange: function(e){ if (e.data === 0) post('ended'); },
      onError: function(e){ post('error:' + e.data); }
    }
  });
}
function setPlay(p){ if(!player || !player.playVideo) return; if(p) player.playVideo(); else player.pauseVideo(); }
function setMute(m){ if(!player || !player.mute) return; if(m) player.mute(); else player.unMute(); }
</script></body></html>`;

const spHtml = (kind, id, alto) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;background:#121212}</style></head>
<body><div id="embed"></div>
<script src="https://open.spotify.com/embed/iframe-api/v1" async></script>
<script>
var ctrl = null, started = false, sent = false;
function post(m){ window.ReactNativeWebView.postMessage(m); }
window.onSpotifyIframeApiReady = function(API){
  API.createController(document.getElementById('embed'),
    { uri: 'spotify:${kind}:${id}', width: '100%', height: ${alto} },
    function(c){
      ctrl = c;
      c.addListener('ready', function(){ post('ready'); });
      c.addListener('playback_update', function(e){
        var d = e.data; if(!d || !d.duration) return;
        if (d.isPaused && d.position >= d.duration - 800 && !sent){ sent = true; post('ended'); }
        if (d.position < d.duration - 3000) sent = false;
      });
    });
};
function setPlay(p){
  if(!ctrl) return;
  if(p){ if(started) ctrl.resume(); else { started = true; ctrl.play(); } }
  else ctrl.pause();
}
function setMute(m){}
</script></body></html>`;

export default function MusicPlayer({ tipo, ytId, spotify, url, reproduciendo, silenciado, onEnded }) {
  const ref = useRef(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(null);

  const key = tipo === 'youtube' ? `yt:${ytId}` : `sp:${spotify?.kind}:${spotify?.id}`;
  const corto = tipo === 'spotify' && (spotify.kind === 'track' || spotify.kind === 'episode');
  const alto = tipo === 'youtube' ? 200 : corto ? 152 : 352;

  useEffect(() => { setListo(false); setError(null); }, [key]);

  // Silencio local: YouTube se mutea sin perder la posición. Spotify no tiene volumen en su API,
  // así que se pausa solo en este teléfono (el estado compartido de la sala no cambia).
  useEffect(() => {
    if (!listo || !ref.current) return;
    const play = tipo === 'spotify' ? !!reproduciendo && !silenciado : !!reproduciendo;
    ref.current.injectJavaScript(`setMute(${!!silenciado}); setPlay(${play}); true;`);
  }, [listo, reproduciendo, silenciado, key]);

  const source = tipo === 'youtube'
    ? { html: ytHtml(ytId), baseUrl: ORIGIN }
    : { html: spHtml(spotify.kind, spotify.id, alto), baseUrl: ORIGIN };

  return (
    <View style={{ marginBottom: 15 }}>
      <View style={{ height: alto, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#00B8FF', backgroundColor: '#000' }}>
        <WebView
          key={key}
          ref={ref}
          originWhitelist={['*']}
          source={source}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          onMessage={(e) => {
            const m = e.nativeEvent.data;
            if (m === 'ready') setListo(true);
            if (m === 'ended' && onEnded && (tipo === 'youtube' || corto)) onEnded();
            if (m.startsWith('error:')) setError(m.slice(6));
          }}
          style={{ backgroundColor: '#000' }}
        />
      </View>

      {error && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#ff4d6d', fontSize: 11 }}>
            YouTube no permite reproducir este video dentro de otras apps (código {error}). Prueba con otro link.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ marginTop: 6 }}>
            <Text style={{ color: '#00B8FF', fontSize: 11 }}>Abrir este video en YouTube</Text>
          </TouchableOpacity>
        </View>
      )}

      {tipo === 'spotify' && (
        <Text style={{ color: '#666', fontSize: 11, marginTop: 8 }}>
          Sin iniciar sesión, Spotify solo reproduce una vista previa de 30 s. Inicia sesión dentro del reproductor para escuchar completo.
          Con listas o álbumes, el avance entre canciones lo hace Spotify.
        </Text>
      )}
    </View>
  );
}
