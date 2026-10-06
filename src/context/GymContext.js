import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth, USAR_STORAGE } from '../config/firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut
} from 'firebase/auth';
import {
  collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, setDoc,
  deleteDoc, deleteField, FieldPath, runTransaction, writeBatch, getDocs, arrayUnion
} from 'firebase/firestore';
import {
  resolverRutina, estadoChecklist, fromKey, userKey, emailDe, calcIMC, tipoLink, toKey
} from '../utils/helpers';
import { subirArchivo, extDeMime, imagenPequena } from '../utils/media';

const GymContext = createContext(null);

const HEARTBEAT_MS = 20000;
const ONLINE_MS = 50000;
const MUSICA_INICIAL = { indice: -1, reproduciendo: false };
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_B64 = 700000; // un documento de Firestore admite 1 MiB

export function GymProvider({ children }) {
  // ---------- Sesión ----------
  const [authListo, setAuthListo] = useState(false);
  const [username, setUsername] = useState('');
  const [activeSalaId, setActiveSalaId] = useState(null);
  const [sala, setSala] = useState(null);
  const [tick, setTick] = useState(0);
  const [mensajes, setMensajes] = useState([]);
  const [colaMusica, setColaMusica] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [progreso, setProgreso] = useState({});
  const [cargas, setCargas] = useState([]);
  const [medidas, setMedidas] = useState([]);

  // Silencios y volúmenes (locales a este teléfono). "Todo" silencia micrófonos y música.
  const [micMuted, setMicMuted] = useState(false);
  const [othersMuted, setOthersMuted] = useState(false);
  const [appMuted, setAppMuted] = useState(false);
  const [volMusica, setVolMusica] = useState(1);
  const [volVoz, setVolVoz] = useState(1);
  const micOff = micMuted || appMuted;
  const othersOff = othersMuted || appMuted;
  const musicOff = appMuted;

  // Firebase recuerda la sesión: al abrir la app se entra directo si ya iniciaste sesión.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUsername(u ? u.displayName || (u.email || '').split('@')[0] : '');
      setAuthListo(true);
    });
  }, []);

  const iniciarSesion = async (nombre, pass) => {
    await signInWithEmailAndPassword(auth, emailDe(nombre), pass);
  };

  const registrar = async (nombre, pass) => {
    const limpio = nombre.trim();
    const cred = await createUserWithEmailAndPassword(auth, emailDe(limpio), pass);
    await updateProfile(cred.user, { displayName: limpio });
    // El perfil liga el nombre al uid: lo usan las reglas de Firestore para proteger los datos de cada usuario.
    await setDoc(doc(db, 'usuarios', userKey(limpio)), { uid: cred.user.uid, nombre: limpio, creadoEn: Date.now() });
    setUsername(limpio);
  };

  const cerrarSesion = async () => {
    setActiveSalaId(null);
    await signOut(auth);
    setUsername('');
  };

  // ---------- Datos de la sala activa ----------
  useEffect(() => {
    if (!activeSalaId || !username) return;
    const salaRef = doc(db, 'salas', activeSalaId);
    const salaCol = (n) => collection(db, 'salas', activeSalaId, n);

    // Presencia: latido cada 20 s. "En línea" = latido de los últimos 50 s.
    const ping = () => updateDoc(salaRef, new FieldPath('presencia', username), Date.now()).catch(() => {});
    ping();
    const hb = setInterval(() => { ping(); setTick((t) => t + 1); }, HEARTBEAT_MS);

    const unsubs = [
      onSnapshot(salaRef, (s) => setSala(s.exists() ? { id: s.id, ...s.data() } : null)),
      onSnapshot(query(salaCol('chat'), orderBy('timestamp', 'asc')), (snap) =>
        setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(salaCol('musica'), orderBy('timestamp', 'asc')), (snap) =>
        setColaMusica(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(salaCol('playlists'), orderBy('creadoEn', 'asc')), (snap) =>
        setPlaylists(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(salaCol('rutinas'), (snap) =>
        setRutinas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(salaCol('progreso'), (snap) => {
        const m = {};
        snap.docs.forEach((d) => { m[d.id] = d.data(); });
        setProgreso(m);
      }),
    ];

    return () => {
      clearInterval(hb);
      unsubs.forEach((u) => u());
      updateDoc(salaRef, new FieldPath('presencia', username), deleteField()).catch(() => {});
      updateDoc(salaRef, new FieldPath('microfonos', username), deleteField()).catch(() => {});
      setSala(null); setMensajes([]); setColaMusica([]); setPlaylists([]); setRutinas([]); setProgreso({});
    };
  }, [activeSalaId, username]);

  // ---------- Datos personales (privados por usuario) ----------
  useEffect(() => {
    if (!username) { setCargas([]); setMedidas([]); return; }
    const base = ['usuarios', userKey(username)];
    const u1 = onSnapshot(collection(db, ...base, 'cargas'), (snap) =>
      setCargas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, ...base, 'medidas'), orderBy('ts', 'desc')), (snap) =>
      setMedidas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [username]);

  const participantes = useMemo(() => {
    const p = sala?.presencia || {};
    const ahora = Date.now();
    return Object.keys(p).filter((n) => ahora - p[n] < ONLINE_MS);
  }, [sala, tick]);

  // Todos los que pertenecen a la sala (hayan entrado alguna vez), estén o no en línea.
  const miembros = useMemo(() => {
    const set = new Set([sala?.creador, ...(sala?.miembros || []), ...Object.keys(sala?.presencia || {})]);
    return [...set].filter(Boolean);
  }, [sala]);

  // Los demás ven un 🔇 junto a tu avatar cuando tu micrófono está apagado.
  useEffect(() => {
    if (!activeSalaId || !username) return;
    updateDoc(doc(db, 'salas', activeSalaId), new FieldPath('microfonos', username), micOff).catch(() => {});
  }, [micOff, activeSalaId, username]);

  // Entrar a una sala la guarda como tuya: seguirá apareciendo en tu lista aunque estés lejos.
  const entrarSala = (s) => {
    setActiveSalaId(s.id);
    updateDoc(doc(db, 'salas', s.id), { miembros: arrayUnion(username) }).catch(() => {});
  };

  const salirSala = () => setActiveSalaId(null);

  // ---------- Chat ----------
  const enviarMensaje = async (texto) => {
    if (!texto.trim() || !activeSalaId) return;
    await addDoc(collection(db, 'salas', activeSalaId, 'chat'), {
      tipo: 'texto', texto: texto.trim(), usuario: username, timestamp: Date.now()
    });
  };

  // Imagen o video (resultado de expo-image-picker). Se sube a Firebase Storage.
  // Si Storage no está disponible, una imagen pequeña se guarda dentro del propio mensaje.
  const enviarMedia = async (asset, onProgress) => {
    if (!activeSalaId) return;
    const esVideo = asset.type === 'video';
    const mime = asset.mimeType || (esVideo ? 'video/mp4' : 'image/jpeg');
    if (esVideo && asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
      throw new Error('El video pesa más de 50 MB.');
    }
    const col = collection(db, 'salas', activeSalaId, 'chat');
    const base = { tipo: esVideo ? 'video' : 'imagen', usuario: username, timestamp: Date.now() };

    // Imagen dentro del propio mensaje (sin Storage): se reduce primero para que quepa.
    const enviarInline = async () => {
      const b64 = await imagenPequena(asset.uri);
      if (b64.length > MAX_B64) throw new Error('La imagen sigue siendo demasiado grande.');
      await addDoc(col, { ...base, b64 });
      return 'inline';
    };

    if (!USAR_STORAGE) {
      if (esVideo) throw new Error('Los videos necesitan Firebase Storage, que no está activado en esta app.');
      return enviarInline();
    }

    try {
      const url = await subirArchivo({
        uri: asset.uri,
        ruta: `salas/${activeSalaId}/chat/${Date.now()}_${userKey(username)}.${extDeMime(mime)}`,
        mime,
        onProgress
      });
      await addDoc(col, { ...base, url });
      return 'storage';
    } catch (e) {
      if (!esVideo) return enviarInline(); // respaldo si Storage falla
      throw e;
    }
  };

  // ---------- Música sincronizada ----------
  const musicaEstado = sala?.musicaEstado || MUSICA_INICIAL;
  const trackActual = musicaEstado.indice >= 0 ? colaMusica[musicaEstado.indice] || null : null;
  const salaRef = () => doc(db, 'salas', activeSalaId);

  const agregarTrack = async (link) => {
    const l = link.trim();
    if (!l || !activeSalaId) return false;
    if (!tipoLink(l)) return false;
    await addDoc(collection(db, 'salas', activeSalaId, 'musica'), {
      link: l, usuario: username, timestamp: Date.now()
    });
    if (musicaEstado.indice === -1) {
      await updateDoc(salaRef(), { 'musicaEstado.indice': 0, 'musicaEstado.reproduciendo': true });
    }
    return true;
  };

  const alternarPlayPausa = () =>
    activeSalaId && trackActual &&
    updateDoc(salaRef(), { 'musicaEstado.reproduciendo': !musicaEstado.reproduciendo });

  const irATrack = (i) =>
    activeSalaId && i >= 0 && i < colaMusica.length &&
    updateDoc(salaRef(), { 'musicaEstado.indice': i, 'musicaEstado.reproduciendo': true });

  const siguiente = () => irATrack(musicaEstado.indice + 1);
  const anterior = () => irATrack(musicaEstado.indice - 1);

  // Ambos teléfonos detectan el fin de la canción; la transacción evita saltar dos veces.
  const finDeCancion = async (indiceTerminado) => {
    if (!activeSalaId) return;
    const total = colaMusica.length;
    try {
      await runTransaction(db, async (t) => {
        const snap = await t.get(salaRef());
        const est = snap.data()?.musicaEstado || MUSICA_INICIAL;
        if (est.indice !== indiceTerminado) return;
        if (indiceTerminado + 1 < total) {
          t.update(salaRef(), { 'musicaEstado.indice': indiceTerminado + 1, 'musicaEstado.reproduciendo': true });
        } else {
          t.update(salaRef(), { 'musicaEstado.reproduciendo': false });
        }
      });
    } catch (e) {}
  };

  // Quita una canción de la cola y reajusta el índice de reproducción para todos.
  const quitarTrack = async (track, indice) => {
    if (!activeSalaId) return;
    const nuevaLen = colaMusica.length - 1;
    const act = musicaEstado.indice;
    const upd = {};
    if (nuevaLen <= 0) {
      upd['musicaEstado.indice'] = -1;
      upd['musicaEstado.reproduciendo'] = false;
    } else if (indice < act) {
      upd['musicaEstado.indice'] = act - 1;
    } else if (indice === act) {
      if (indice >= nuevaLen) {
        upd['musicaEstado.indice'] = nuevaLen - 1;
        upd['musicaEstado.reproduciendo'] = false;
      } else {
        upd['musicaEstado.reproduciendo'] = true; // entra la siguiente en ese mismo lugar
      }
    }
    const batch = writeBatch(db);
    batch.delete(doc(db, 'salas', activeSalaId, 'musica', track.id));
    if (Object.keys(upd).length) batch.update(salaRef(), upd);
    await batch.commit();
  };

  // ---------- Playlists (colecciones de canciones de la sala) ----------
  const plDoc = (plId) => doc(db, 'salas', activeSalaId, 'playlists', plId);
  const plSongs = (plId) => collection(db, 'salas', activeSalaId, 'playlists', plId, 'canciones');

  const crearPlaylist = async (nombre) => {
    const n = nombre.trim();
    if (!n || !activeSalaId) return false;
    await addDoc(collection(db, 'salas', activeSalaId, 'playlists'), { nombre: n, creador: username, creadoEn: Date.now() });
    return true;
  };

  const eliminarPlaylist = async (pl) => {
    const snap = await getDocs(plSongs(pl.id));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(plDoc(pl.id));
    await batch.commit();
  };

  const agregarAPlaylist = async (plId, link) => {
    const l = link.trim();
    if (!l || !tipoLink(l)) return false;
    await addDoc(plSongs(plId), { link: l, usuario: username, timestamp: Date.now() });
    return true;
  };

  const quitarDePlaylist = (plId, songId) => deleteDoc(doc(plSongs(plId), songId));

  const escucharCancionesPlaylist = (plId, cb) =>
    onSnapshot(query(plSongs(plId), orderBy('timestamp', 'asc')), (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

  // reemplazar = true: la cola pasa a ser la playlist y empieza a sonar. false: se añade al final.
  const reproducirPlaylist = async (canciones, reemplazar) => {
    if (!activeSalaId || !canciones.length) return;
    const batch = writeBatch(db);
    if (reemplazar) colaMusica.forEach((t) => batch.delete(doc(db, 'salas', activeSalaId, 'musica', t.id)));
    const base = Date.now();
    canciones.forEach((c, i) =>
      batch.set(doc(collection(db, 'salas', activeSalaId, 'musica')), {
        link: c.link, usuario: c.usuario || username, timestamp: base + i
      }));
    if (reemplazar || musicaEstado.indice === -1) {
      batch.update(salaRef(), { 'musicaEstado.indice': reemplazar ? 0 : colaMusica.length, 'musicaEstado.reproduciendo': true });
    }
    await batch.commit();
  };

  // ---------- Rutinas ----------
  const rutinaRef = (id) => doc(db, 'salas', activeSalaId, 'rutinas', id);

  const mutarEjercicios = (refId, fn) =>
    runTransaction(db, async (t) => {
      const ref = rutinaRef(refId);
      const snap = await t.get(ref);
      const arr = snap.exists() ? snap.data().ejercicios || [] : [];
      t.set(ref, { ejercicios: fn(arr) }, { merge: true });
    });

  // Si "repetir" está activo, la configuración pasa a la plantilla semanal de ese día
  // (aplica a esa fecha y a todas las siguientes). Si no, solo afecta a ese día.
  const guardarDia = async (fecha, titulo, descripcion, repetir) => {
    if (!activeSalaId) return;
    const dow = fromKey(fecha).getDay();
    const actual = resolverRutina(fecha, rutinas);
    const ejercicios = actual?.ejercicios || [];
    if (repetir) {
      const sem = rutinas.find((r) => r.id === `semanal_${dow}`);
      const desde = sem?.desde && sem.desde < fecha ? sem.desde : fecha;
      await setDoc(rutinaRef(`semanal_${dow}`), { titulo, descripcion, ejercicios, desde, dow });
      await deleteDoc(rutinaRef(`dia_${fecha}`)).catch(() => {});
    } else {
      await setDoc(rutinaRef(`dia_${fecha}`), { titulo, descripcion, ejercicios, aislado: true, fecha });
    }
  };

  const agregarEjercicio = async (fecha, ej) => {
    const actual = resolverRutina(fecha, rutinas);
    if (!actual) return;
    await mutarEjercicios(actual.refId, (arr) => [...arr, ej]);
  };

  const eliminarEjercicio = async (fecha, id) => {
    const actual = resolverRutina(fecha, rutinas);
    if (!actual) return;
    await mutarEjercicios(actual.refId, (arr) => arr.filter((e) => e.id !== id));
  };

  // Marca/desmarca un ejercicio para ESTE usuario en ESA fecha y registra la carga en su historial.
  const toggleEjercicio = async (fecha, ej, hecho) => {
    await setDoc(
      doc(db, 'salas', activeSalaId, 'progreso', fecha),
      { completados: { [username]: { [ej.id]: hecho } } },
      { merge: true }
    );
    const cargaRef = doc(db, 'usuarios', userKey(username), 'cargas', `${fecha}_${ej.id}`);
    if (hecho) {
      await setDoc(cargaRef, {
        ejercicio: ej.nombre.trim().toLowerCase(),
        nombre: ej.nombre,
        peso: parseFloat(String(ej.peso).replace(',', '.')) || 0,
        reps: parseInt(ej.reps, 10) || 0,
        sets: parseInt(ej.sets, 10) || 0,
        fecha,
        ts: Date.now()
      });
    } else {
      await deleteDoc(cargaRef).catch(() => {});
    }
  };

  // Marca el primer ejercicio sin check del día de hoy (lo usa el botón "Check" de la notificación).
  const checkSiguienteEjercicio = async () => {
    const fecha = toKey(new Date());
    const { siguiente: sig } = estadoChecklist(fecha, rutinas, progreso, username);
    if (!sig) return null;
    await toggleEjercicio(fecha, sig, true);
    return sig;
  };

  // ---------- Métricas ----------
  const guardarMedida = async (peso, altura) => {
    const imc = calcIMC(peso, altura);
    if (!imc) return false;
    await addDoc(collection(db, 'usuarios', userKey(username), 'medidas'), {
      peso: parseFloat(String(peso).replace(',', '.')),
      altura: parseFloat(String(altura).replace(',', '.')),
      imc: Math.round(imc * 10) / 10,
      fecha: toKey(new Date()),
      ts: Date.now()
    });
    return true;
  };

  const num = (v) => parseFloat(String(v).replace(',', '.'));
  const miDoc = (col, id) => doc(db, 'usuarios', userKey(username), col, id);

  const editarMedida = async (id, peso, altura, fecha) => {
    const imc = calcIMC(peso, altura);
    if (!imc || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    await updateDoc(miDoc('medidas', id), {
      peso: num(peso), altura: num(altura), imc: Math.round(imc * 10) / 10, fecha
    });
    return true;
  };
  const eliminarMedida = (id) => deleteDoc(miDoc('medidas', id));

  const editarCarga = async (id, peso, reps, sets) => {
    const p = num(peso);
    if (isNaN(p) || p < 0) return false;
    await updateDoc(miDoc('cargas', id), { peso: p, reps: parseInt(reps, 10) || 0, sets: parseInt(sets, 10) || 0 });
    return true;
  };
  const eliminarCarga = (id) => deleteDoc(miDoc('cargas', id));

  // Solo lectura: las métricas de otro miembro de la sala.
  const escucharMetricasDe = (nombre, cb) => {
    const base = ['usuarios', userKey(nombre)];
    let med = [];
    let car = [];
    const emit = () => cb({ medidas: med, cargas: car });
    const u1 = onSnapshot(query(collection(db, ...base, 'medidas'), orderBy('ts', 'desc')), (snap) => {
      med = snap.docs.map((d) => ({ id: d.id, ...d.data() })); emit();
    });
    const u2 = onSnapshot(collection(db, ...base, 'cargas'), (snap) => {
      car = snap.docs.map((d) => ({ id: d.id, ...d.data() })); emit();
    });
    return () => { u1(); u2(); };
  };

  return (
    <GymContext.Provider value={{
      authListo, username, iniciarSesion, registrar, cerrarSesion,
      activeSalaId, setActiveSalaId, entrarSala, salirSala,
      sala, participantes, miembros, mensajes, colaMusica, musicaEstado, trackActual,
      micMuted, setMicMuted, othersMuted, setOthersMuted, appMuted, setAppMuted,
      micOff, othersOff, musicOff,
      volMusica, setVolMusica, volVoz, setVolVoz,
      enviarMensaje, enviarMedia,
      agregarTrack, alternarPlayPausa, siguiente, anterior, irATrack, finDeCancion, quitarTrack,
      playlists, crearPlaylist, eliminarPlaylist, agregarAPlaylist, quitarDePlaylist,
      escucharCancionesPlaylist, reproducirPlaylist,
      rutinas, progreso, guardarDia, agregarEjercicio, eliminarEjercicio, toggleEjercicio, checkSiguienteEjercicio,
      cargas, medidas, guardarMedida, editarMedida, eliminarMedida, editarCarga, eliminarCarga,
      escucharMetricasDe
    }}>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error('useGym debe usarse dentro de <GymProvider>');
  return ctx;
}
