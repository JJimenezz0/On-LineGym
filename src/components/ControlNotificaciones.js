import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useGym } from '../context/GymContext';
import { estadoChecklist, toKey } from '../utils/helpers';
import {
  ACC, prepararNotificaciones, publicarAudio, publicarChecklist, quitarNotificaciones
} from '../utils/notificaciones';

// Carga segura y dinámica de expo-notifications para evitar errores fatales en Expo Go (Android)
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Entorno sin soporte nativo de notificaciones (ej. Expo Go en Android)
}

// No pinta nada: mantiene las notificaciones sincronizadas con el estado y atiende sus botones.
// Se monta dentro de la sala y al salir las quita.
export default function ControlNotificaciones() {
  const ctx = useGym();
  const ref = useRef(ctx);
  ref.current = ctx; // el listener siempre lee el estado más reciente

  const [permiso, setPermiso] = useState(false);
  const [hoy, setHoy] = useState(toKey(new Date()));

  useEffect(() => {
    if (!Notifications) return; // Si no hay soporte, omitimos configuración
    let vivo = true;
    prepararNotificaciones()
      .then((ok) => {
        if (!vivo) return;
        setPermiso(ok);
        if (!ok) {
          Alert.alert(
            'Notificaciones desactivadas',
            'Actívalas en los ajustes del teléfono para controlar el audio y el checklist desde la barra de notificaciones.'
          );
        }
      })
      .catch(() => {});
    return () => { vivo = false; quitarNotificaciones(); };
  }, []);

  // Cambia el día a medianoche sin reiniciar la app
  useEffect(() => {
    const t = setInterval(() => setHoy(toKey(new Date())), 60000);
    return () => clearInterval(t);
  }, []);

  // Botones de las notificaciones
  useEffect(() => {
    if (!Notifications || typeof Notifications.addNotificationResponseReceivedListener !== 'function') {
      return;
    }
    
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const c = ref.current;
      switch (resp.actionIdentifier) {
        case ACC.MIC: if (!c.appMuted) c.setMicMuted((v) => !v); break;
        case ACC.OTROS: if (!c.appMuted) c.setOthersMuted((v) => !v); break;
        case ACC.TODO: c.setAppMuted((v) => !v); break;
        case ACC.CHECK: c.checkSiguienteEjercicio().catch(() => {}); break;
        default: break;
      }
    });
    return () => sub.remove();
  }, []);

  // Notificación de audio: se actualiza cuando cambia algún silencio
  const { micOff, othersOff, appMuted } = ctx;
  useEffect(() => {
    if (permiso) publicarAudio({ micOff, othersOff, appMuted }).catch(() => {});
  }, [permiso, micOff, othersOff, appMuted]);

  // Notificación de checklist: se actualiza cuando cambia el ejercicio siguiente o el avance
  const est = estadoChecklist(hoy, ctx.rutinas, ctx.progreso, ctx.username);
  const clave = `${hoy}|${est.rutina?.titulo || ''}|${est.siguiente?.id || ''}|${est.hechos}|${est.total}`;
  useEffect(() => {
    if (permiso) publicarChecklist(est).catch(() => {});
  }, [permiso, clave]);

  return null;
}