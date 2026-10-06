import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import {
  collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, setDoc,
  deleteDoc, deleteField, FieldPath, runTransaction, writeBatch
} from 'firebase/firestore';
import { resolverRutina, fromKey, userKey, calcIMC, tipoLink, toKey } from '../utils/helpers';

const GymContext = createContext(null);

const HEARTBEAT_MS = 20000;
const ONLINE_MS = 50000;
const MUSICA_INICIAL = { indice: -1, reproduciendo: false };

export function GymProvider({ children }) {
  const [username, setUsername] = useState('');
  const [activeSalaId, setActiveSalaId] = useState(null);
  const [sala, setSala] = useState(null);
  const [tick, setTick] = useState(0);
  const [mensajes, setMensajes] = useState([]);
  const [colaMusica, setColaMusica] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [progreso, setProgreso] = useState({});
  const [cargas, setCargas] = useState([]);
  const [medidas, setMedidas] = useState([]);

  // Silencios (locales a este teléfono). "Todo" silencia micrófonos y música.
  const [micMuted, setMicMuted] = useState(false);
  const [othersMuted, setOthersMuted] = useState(false);
  const [appMuted, setAppMuted] = useState(false);
  const micOff = micMuted || appMuted;
  const othersOff = othersMuted || appMuted;
  const musicOff = appMuted;

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
      setSala(null); setMensajes([]); setColaMusica([]); setRutinas([]); setProgreso({});
    };
  }, [activeSalaId, username]);

  // ---------- Datos personales (privados por usuario) ----------
  useEffect(() => {
    if (!username) return;
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

  // Los demás ven un 🔇 junto a tu avatar cuando tu micrófono está apagado.
  useEffect(() => {
    if (!activeSalaId || !username) return;
    updateDoc(doc(db, 'salas', activeSalaId), new FieldPath('microfonos', username), micOff).catch(() => {});
  }, [micOff, activeSalaId, username]);

  const salirSala = () => setActiveSalaId(null);

  // ---------- Chat ----------
  const enviarMensaje = async (texto) => {
    if (!texto.trim() || !activeSalaId) return;
    await addDoc(collection(db, 'salas', activeSalaId, 'chat'), {
      texto: texto.trim(), usuario: username, timestamp: Date.now()
    });
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

  return (
    <GymContext.Provider value={{
      username, setUsername,
      activeSalaId, setActiveSalaId, salirSala,
      sala, participantes, mensajes, colaMusica, musicaEstado, trackActual,
      micMuted, setMicMuted, othersMuted, setOthersMuted, appMuted, setAppMuted,
      micOff, othersOff, musicOff,
      enviarMensaje,
      agregarTrack, alternarPlayPausa, siguiente, anterior, irATrack, finDeCancion, quitarTrack,
      rutinas, progreso, guardarDia, agregarEjercicio, eliminarEjercicio, toggleEjercicio,
      cargas, medidas, guardarMedida, editarMedida, eliminarMedida, editarCarga, eliminarCarga
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
