import { Platform } from 'react-native';

// Importación dinámica segura para evitar errores fatales en Expo Go (Android)
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // El entorno no soporta notificaciones (ej. Expo Go en Android)
}

// Dos notificaciones persistentes mientras estás en una sala:
//  - Audio: 3 botones (mic, otros, todo)
//  - Checklist: 1 botón "Check"
const CANAL = 'controles';
export const ID_AUDIO = 'og-audio';
export const ID_CHECK = 'og-check';
export const ACC = { MIC: 'mic', OTROS: 'otros', TODO: 'todo', CHECK: 'check' };

// Configuración inicial solo si el módulo está disponible
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  });
}

const accion = (identifier, buttonTitle) => ({
  identifier,
  buttonTitle,
  options: { opensAppToForeground: false } // el botón actúa sin abrir la app
});

export async function prepararNotificaciones() {
  if (!Notifications) return false;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Controles de sala',
      importance: Notifications.AndroidImportance.LOW, // silenciosa: las actualizaciones no suenan ni vibran
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  return status === 'granted';
}

// Para actualizar una notificación se descarta la anterior y se publica de nuevo con el mismo id.
async function reemplazar(id, content) {
  if (!Notifications) return;
  try { await Notifications.dismissNotificationAsync(id); } catch (e) {}
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { ...content, sticky: true, autoDismiss: false },
    trigger: Platform.OS === 'android' ? { channelId: CANAL } : null
  });
}

export async function publicarAudio({ micOff, othersOff, appMuted }) {
  if (!Notifications) return;
  // Los títulos de los botones cambian según el estado, así que se vuelve a registrar la categoría.
  await Notifications.setNotificationCategoryAsync('audio', [
    accion(ACC.MIC, micOff ? 'Activar mic' : 'Mutear mic'),
    accion(ACC.OTROS, othersOff ? 'Oír otros' : 'Mutear otros'),
    accion(ACC.TODO, appMuted ? 'Activar todo' : 'Silenciar todo')
  ]);
  await reemplazar(ID_AUDIO, {
    title: 'On-LineGym · Audio',
    body: `Mic ${micOff ? 'apagado' : 'activo'} · Otros ${othersOff ? 'silenciados' : 'activos'} · Música ${appMuted ? 'silenciada' : 'activa'}`,
    categoryIdentifier: 'audio'
  });
}

export async function publicarChecklist({ rutina, siguiente, hechos, total }) {
  if (!Notifications) return;
  
  let title = 'Rutina de hoy';
  let body;
  let categoryIdentifier;

  if (!rutina) {
    body = 'No hay rutina configurada para hoy.';
  } else if (total === 0) {
    title = `Hoy: ${rutina.titulo}`;
    body = 'Aún no hay ejercicios en la rutina.';
  } else if (!siguiente) {
    title = `Hoy: ${rutina.titulo}`;
    body = `¡Rutina completa! ${hechos}/${total} ejercicios ✓`;
  } else {
    title = `Hoy: ${rutina.titulo}`;
    body = `Siguiente: ${siguiente.nombre} (${siguiente.sets}x${siguiente.reps}, ${siguiente.peso} kg) · ${hechos}/${total}`;
    categoryIdentifier = 'checklist';
    await Notifications.setNotificationCategoryAsync('checklist', [accion(ACC.CHECK, 'Check')]);
  }
  await reemplazar(ID_CHECK, { title, body, categoryIdentifier });
}

export async function quitarNotificaciones() {
  if (!Notifications) return;
  for (const id of [ID_AUDIO, ID_CHECK]) {
    try { await Notifications.dismissNotificationAsync(id); } catch (e) {}
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch (e) {}
  }
}